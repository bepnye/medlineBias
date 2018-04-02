import sys, os, re, random, string, traceback
from glob import glob
from bs4 import BeautifulSoup as BS
import cPickle as pkl
from collections import defaultdict, namedtuple

import global_vars
reload(global_vars)
from global_vars import *

import nltk_stuff
reload(nltk_stuff)
from nltk_stuff import *

import utils
reload(utils)
from utils import *

import nlp
reload(nlp)
from nlp import *

def parse_mesh_tree(fname):
  mesh_terms = []
  with open(fname) as fp_in:
    term_text = ''
    mode = 'GET_NEW_TERM'

    for line in fp_in:
      if mode == 'GET_NEW_TERM':
        if line.startswith('<DescriptorRecord DescriptorClass ='):
          term_text += line.strip()
          mode = 'BUILD_TERM'
        else:
          # keep scanning file
          pass

      elif mode == 'BUILD_TERM':
        term_text += line.strip()
        if line.startswith(' </DescriptorRecord>'):
          mesh_terms.append(mesh_tree_lines_to_term(term_text))
          term_text = ''
          mode = 'GET_NEW_TERM'

  return mesh_terms

def mesh_tree_lines_to_term(lines):
  s = BS(lines, 'xml')
  UI = s.DescriptorUI.text
  name = s.DescriptorName.String.text

  quals = []
  try:
    quals = [q.QualifierUI.text for q in s.AllowableQualifiersList.findAll('AllowableQualifier')]
  except AttributeError:
    pass

  tree_nums = []
  try:
    tree_nums = [t.text for t in s.TreeNumberList.findAll('TreeNumber')]
  except AttributeError:
    pass

  pref_concept = None
  try:
    pref_concept = [c.ConceptName.text for c in s.ConceptList.findAll('Concept') if c['PreferredConceptYN'] == 'Y'][0]
  except AttributeError:
    pass

  prev_indexing = []
  try:
    prev_indexing = [p.text for p in s.PreviousIndexingList.findAll('PreviousIndexing')]
  except AttributeError:
    pass
  
  return MeshTreeTerm(UI, name, quals, tree_nums, pref_concept, prev_indexing)

def write_xml(fname, TARGET_PMIDS = None):
  print 'Starting %s...' %fname
  with open('%s' %(fname)) as fp_in:
    n_articles = 0
    n_random_trials = 0
    article = []
    mode = 'ACQUIRE'
    #fp_out.write('<MedlineCitationSet>\n')

    prev_line = ''
    pmid = 0

    for line in fp_in:
      if mode == 'ACQUIRE':
        if line.startswith('<MedlineCitation Owner='):
          article.append(line)
          mode = 'VALIDATE'
          n_articles += 1

      elif mode == 'VALIDATE':
        if line.startswith('<MedlineCitation Owner='):
          raise Exception('Found new article while in mode = %s' %mode)
        article.append(line)
        if line.startswith('<PublicationType UI="D016449">Randomized Controlled Trial'):
          mode = 'ACCEPT'
        if line.startswith('</PublicationTypeList>'):
          mode = 'REJECT'
        if line.startswith('<PMID Version='):
          pmid = int(re.sub('<[^>]*>', '', line))

      elif mode == 'ACCEPT':
        if line.startswith('<DescriptorName') and prev_line.startswith('<MeshHeading'):
          article.append(re.sub('<[^>]*>', '', line))
        if line.startswith('<MedlineCitation Owner='):
          raise Exception('Found new article while in mode = %s' %mode)
        if line.startswith('</MedlineCitation>'):
          n_random_trials += 1
          assert pmid != 0
          with open('%s/%d.xml' %(XML_TOP, pmid), 'w') as fp_out:
            str_out = ''.join(article)
            fp_out.write(str_out)
            article = []
            pmid = 0
            mode = 'ACQUIRE'

      elif mode == 'REJECT':
        if line.startswith('<MedlineCitation Owner='):
          raise Exception('Found new article while in mode = %s' %mode)
        if line.startswith('</MedlineCitation>'):
          article = []
          mode = 'ACQUIRE'
    
      else:
        raise Exception('Unknown mode: %s' %mode)

      prev_line = line
      #fp_out.write('</MedlineCitationSet>\n')

  #print 'Done, found %d/%d randomized controlled trials' %(n_random_trials, n_articles)
  if n_random_trials > 0:
    print '      avg len: %.2f' %(sum(article_lens) / float(len(article_lens)))
    print '      max len: %.2f' %max(article_lens)
    print '      min len: %.2f' %min(article_lens)

def write_all_xml():
  fnames = glob('%s/*' %SOURCE_TOP)
  for f in fnames:
    print 'Writing XML for %s' %f
    write_xml(f)

def write_pkl_old(fname):
  with open('%s/%s' %(XML_TOP, fname)) as fp_in:
    print 'Reading %s...' %fname
    text = fp_in.read()
    print 'Soupifying xml...'
    soup = BS(text, 'xml')
    sys.setrecursionlimit(100000)
    print 'Writing pkl..'
    with open('%s/%s.pkl' %(PKL_TOP, fname), 'wb') as fp_out:
      pkl.dump(soup, fp_out, pkl.HIGHEST_PROTOCOL)
    print 'Done'

def write_all_pkl():
  fnames = sorted([f.split('/')[-1] for f in glob('%s/*' %XML_TOP)])
  for f in fnames:
    write_pkl_old(f)

def load_mesh_dicts():
  return [pkl.load(open(fname+'.pkl')) for fname in ['mesh_to_id', 'id_to_mesh', 'id_to_abst', 'id_to_lemm']]

def get_date(article_soup):
  try:
    year = article_soup.PubDate.Year.string.encode('ascii', 'ignore')
    month = article_soup.PubDate.Month.string.encode('ascii', 'ignore')
  except AttributeError:
    try:
      years, months = article_soup.PubDate.MedlineDate.string.encode('ascii', 'ignore').split(' ')[0:2]
      year = years.split('-')[0]
      month = months.split('-')[0]
    except (AttributeError, ValueError):
      try:
        year = article_soup.DateCompleted.Year.text
        month = article_soup.DateCompleted.Month.text
      except AttributeError:
        print 'Unable to find PubDate for PMID = %s' %(article_soup.PMID.text)
        raise
  return Date(year, month)

def get_abstract(article_soup):
  abst_strings = []
  abstract = article_soup.Abstract
  if abstract != None:
    for paragraph in abstract.findAll('AbstractText'):
      try:
        label = paragraph['Label'].encode('ascii', 'ignore')
        abst_strings.append(label)
      except KeyError:
        pass
      try:
        abst_strings.append(paragraph.string.encode('ascii', 'ignore'))
      except AttributeError:
        pass
  abst_txt = ' '.join(abst_strings)
  return abst_txt

def mesh_soup_to_MeshTerm(m):
  qs = m.findAll('QualifierName')
  quals = [MeshTerm(q['UI'], q.text, q['MajorTopicYN'], []) for q in qs]
  desc = m.DescriptorName
  mesh = MeshTerm(desc['UI'], desc.text, desc['MajorTopicYN'], quals)
  return mesh

def get_mesh(article_soup):
  try:
    mesh_soups = article_soup.MeshHeadingList.findAll('MeshHeading')
  except AttributeError:
    mesh_soups = []
  mesh_terms = map(mesh_soup_to_MeshTerm, mesh_soups)
  return mesh_terms

def get_authors(article_soup):
  try:
    author_soups = article_soup.AuthorList.findAll('Author')
    authors = [Author(a.LastName.text, a.ForeName.text, a.Initials.text) for a in author_soups]
  except AttributeError:
    authors = []
  return authors

def get_pub_types(article_soup):
  try:
    p = [term.string.encode('ascii', 'ignore') for term in article_soup.PublicationTypeList.findAll('PublicationType')]
  except AttributeError:
    p = []
  return p

def get_journal(article_soup):
  try:
    title = article_soup.Journal.Title.text
    issn = article_soup.Journal.ISSN.text
    j = Journal(title, issn)
  except AttributeError:
    j = None
  return j

def article_soup_to_namedtuple(article):
  a = {}
  a['abst'] = get_abstract(article)
  a['date'] = get_date(article)
  a['mesh'] = get_mesh(article)
  a['authors'] = get_authors(article)
  a['journal'] = get_journal(article)
  a['pub_types'] = get_pub_types(article)
  for field in ['PMID', 'Country', 'Affiliation']:
    try:
      val = article.findAll(field)[0].text
    except IndexError:
      val = ''
    a[field] = val

  article = Article(**a)
  return article

def write_working_data(fname):
  soup = pkl.load(open(fname, 'rb'))
  try:
    articles = soup.MedlineCitationSet.findAll('MedlineCitation')
  except AttributeError:
    articles = []

  bad_articles = []

  print 'Found %03d articles in %s' %(len(articles), fname)
  for article in articles:
    try:
      a = article_soup_to_namedtuple(article)
      article_dir = os.path.join(ARTICLE_TOP, a.date.year)
      article_fname = '%s.pkl' %a.PMID
      os.system('mkdir -p %s' %article_dir)
      write_pkl(os.path.join(article_dir, article_fname), a)
    except AttributeError as e:
      print 'Choked on article:', fname, a.PMID
      bad_articles.append((article, traceback.format_exc()))

  return bad_articles

def write_mesh_pkls():
  mesh_to_id, id_to_mesh, id_to_abst = get_mesh_dicts()
  for fname, data in [('mesh_to_id.pkl', mesh_to_id),
          ('id_to_mesh.pkl', id_to_mesh),
          ('id_to_abst.pkl', id_to_abst)]:
    write_pkl(fname, data)

def get_id_to_tokens(id_to_abst):
  id_to_tokens = {}
  for i, abst in id_to_abst.items():
    id_to_tokens[i] = tokenize_abstract(abst)
  return id_to_tokens

def get_age_label(mesh_terms):
  age_terms = intersection(mesh_terms, AGE_TERMS)
  age_range = get_age_range(mesh_terms)
  target_labels = { 'Young' : (0, 18),
        'Adult' : (19, 44),
        'Old'   : (45, 100) }
  for label, (lower_bound, upper_bound) in target_labels.items():
    if age_range[0] >= lower_bound and age_range[1] <= upper_bound:
      return label
  return 'Unknown'

def get_age_range(mesh_terms):
  age_terms = intersection(mesh_terms, AGE_TERMS)
  if age_terms:
    min_ages, max_ages = zip(*[AGE_RANGES[age] for age in age_terms])
    age_range = (min(min_ages), max(max_ages))
  else:
    age_range = (-1,-1)
  return age_range

def plot_age(id_to_mesh, print_thresh = 1.0):
  N = len(id_to_mesh)
  age_ranges = {}
  for i, terms in id_to_mesh.items():
    age_range = get_age_range(terms)
    if age_range not in age_ranges:
      age_ranges[age_range] = []
    age_ranges[age_range].append(i)

  for (age_range, ids) in sorted(age_ranges.items(), key = lambda (k,v): k):
    percent = 100*len(ids)/float(N)
    if percent > print_thresh:
      print '%s%% %s/%s %s' % \
    (lpad('%.2f' %(percent), 5),
     lpad(len(ids), len(str(N))),
     str(N),
     str(age_range))
  return age_ranges

def get_mesh_freq(target_ids, id_to_mesh):
  N = len(target_ids)
  freqs = defaultdict(float)
  for i in target_ids:
    for mesh in id_to_mesh[i]:
      freqs[mesh] = freqs[mesh] + 1.0/N
  return freqs

def get_word_freq(target_ids, id_to_abst):
  freqs = defaultdict(float)
  for i in target_ids:
    for w in id_to_abst[i]:
      freqs[w] = freqs[w] + 1.0;
  N = float(sum(freqs.values()))
  for w in freqs:
    freqs[w] /= N
  return freqs


def plot_terms_compare(mesh_to_id, id_to_mesh, id_to_abst, target_ids, bg_ids = None):
  bg_ids = bg_ids or id_to_mesh.keys()
  N = float(len(id_to_mesh))
  print 'MeSH term frequency for selected articles (%d/%d)' %(len(target_ids), len(bg_ids))
  target_freq = get_mesh_freq(target_ids, id_to_mesh)
  bg_freq = get_mesh_freq(bg_ids, id_to_mesh)
  #target_freq = get_word_freq(target_ids, id_to_abst)
  #bg_freq = get_word_freq(bg_ids, id_to_abst)
  freq_diffs = { mesh: target_freq[mesh]-bg_freq[mesh] for mesh in target_freq }
  freq_lor = { mesh: log_or_0(target_freq[mesh],bg_freq[mesh]) for mesh in target_freq }
  top, bottom = get_extreme_weights(freq_diffs, 15)
  for lst, label in [(top, 'Selected articles'), (bottom, 'Background corpus')]:
    print label
    print '%s %s %s' %(rpad('LOR', 6), rpad('targ', 6), rpad('bg', 6))
    for mesh, weight in lst:
      print '%s %s%% %s%% %s' %(\
    rpad(round(weight, 2), 4, '0'),
    lpad(100*round(target_freq[mesh], 4), 6, ' '),
    lpad(100*round(bg_freq[mesh], 3), 5, ' '),
    mesh)


def plot_terms_generic(mesh_to_id, id_to_mesh, mesh_terms, print_thresh = 1.0, filter_func = None):
  all_ids = id_to_mesh.keys()
  if filter_func:
    filtered_ids = [i for i in all_ids if filter_func(i, id_to_mesh[i])]
    all_ids = filtered_ids
  N = len(all_ids)

  print 'Checking %d articles, tags = %s' %(N, ', '.join(mesh_terms))
  print

  n_terms = { i: [] for i in range(len(mesh_terms)+1) }
  for i in all_ids:
    terms = [t for t in mesh_terms if t in id_to_mesh[i]]
    n_terms[len(terms)].append(i)

  print 'Number of top-level age terms per article'
  for (n, ids) in n_terms.items():
    print '%s%% %s/%s %d' % \
  (lpad('%.2f' %(100*len(ids)/float(N)), 5),
   lpad(len(ids), len(str(N))),
   str(N),
   n)
  print

  print 'Number of articles with selected tags (Subset)'
  strings = []
  for s in powerset(mesh_terms, 3):
    is_valid_id = lambda i: set(s).issubset(intersection(mesh_terms, id_to_mesh[i]))
    valid_ids = [i for i in all_ids if is_valid_id(i)]
    percent = 100*len(valid_ids)/float(N)
    if percent >= print_thresh:
      strings.append('%s%% %s/%s %s' % \
    (lpad('%.2f' %percent, 6),
     lpad(len(valid_ids), len(str(N))),
     str(N),
     ', '.join(sorted(s))))
  print '\n'.join(reversed(sorted(strings)))

  print 'Number of articles with selected tags (Equal)'
  string_bits = []
  for s in powerset(mesh_terms, 3):
    is_valid_id = lambda i: set(s) == set(intersection(mesh_terms, id_to_mesh[i]))
    valid_ids = [i for i in all_ids if is_valid_id(i)]
    percent = 100*len(valid_ids)/float(N)

    if percent >= print_thresh:
      string_bits.append([percent, len(valid_ids), ', '.join(s)])
  
  string_bits = sorted(string_bits, key = lambda (perc,ids,tags): -1*perc)
  cum_percent = 0.0
  for [percent,ids,tags] in string_bits:
      cum_percent += percent
      print '%s%% %s%% %s/%s %s' % \
    (lpad('%.2f' %cum_percent, 6),
     lpad('%.2f' %percent, 6),
     lpad(ids, len(str(N))),
     str(N),
     tags)
  print

def get_id_to_bow(id_to_tokens):
  id_to_bow = { i: get_token_bow(tokens) for i,tokens in id_to_tokens.items() }
  return id_to_bow

def compare_target_vs_base(id_to_bow, target_ids, cutoff = 10, n_printed = 10):
  df = get_doc_freq(id_to_bow)
  lm_base = get_pruned_lm(get_lm_from_bow(id_to_bow), cutoff)
  lm_target = get_pruned_lm(get_lm_from_bow(id_to_bow, target_ids), cutoff)
  N_base = float(sum(lm_base.values()))
  N_target = float(sum(lm_target.values()))
  weights = get_tf_idf_weights(lm_base, lm_target, df)
  top, bottom = get_extreme_weights(weights, n_printed)
  for lst, label in [(top, 'Selected articles'), (bottom, 'Background corpus')]:
    print label
    print '%s %s %s %s' %(lpad('word', 15), rpad('bg freq', 8), rpad('targ f.', 8), rpad('doc freq', 6))
    for word, weight in lst:
      print '%s %s %s %s' %( \
  lpad(word, 15),
  rpad(round(lm_base[word]/N_base,     6), 8, '0'),
  rpad(round(lm_target[word]/N_target, 6), 8, '0'),
  rpad(round(df[word],         4), 6, '0'))

def compare_sex_weights(id_to_bow, id_to_mesh):
  id_male   = [i for i,terms in id_to_mesh.items() if 'Male' in terms and 'Female' not in terms]
  id_female = [i for i,terms in id_to_mesh.items() if 'Female' in terms and 'Male' not in terms]
  for label, target_ids in [('Male only', id_male), ('Female only', id_female)]:
    print label, len(target_ids), '/', len(id_to_mesh), 100*round(float(len(target_ids))/len(id_to_mesh), 2)
    compare_target_vs_base(id_to_bow, target_ids, 20, 50)
    print

def compare_age_weights(id_to_bow, id_to_mesh):
  target_id_dict = { 'Unknown' : [],
         'Young' : [],
         'Adult' : [],
         'Old' : [] }
  for i,terms in id_to_mesh.items():
    target_id_dict[get_age_label(terms)].append(i)
  for label, target_ids in target_id_dict.items():
    print label, len(target_ids), '/', len(id_to_mesh), 100*round(float(len(target_ids))/len(id_to_mesh), 2)
    compare_target_vs_base(id_to_bow, target_ids, 30, 20)
    print

def get_extreme_weights(weights, n = 10):
  sorted_weights = sorted(weights.items(), key = lambda (k,v): v)
  top = sorted_weights[-n:][::-1]
  bottom = sorted_weights[:n]
  return top, bottom

def get_normalized_lm(lm):
  N = float(sum(lm.values()))
  lm_norm = { w:count/N for w,count in lm.items() }
  return lm_norm

def get_doc_freq(id_to_bow):
  N = 0
  df = {}
  for i,bow in id_to_bow.items():
    N += 1
    for w,count in bow.items():
      if w not in df:
        df[w] = 0
      df[w] += 1
  for w in df:
    df[w] /= float(N)
  return df

def get_tf_idf_weights(lm_base, lm_target, df):
  tf_base = get_normalized_lm(lm_base)
  tf_target = get_normalized_lm(lm_target)
  weights = {}
  for word in tf_target:
    weights[word] = (tf_target[word] - tf_base[word]) / tf_base[word]# / df[word]
    #weights[word] = tf_target[word] / df[word]
  return weights

def get_pruned_lm(lm, cutoff = 5):
  pruned_lm = {}
  for w,n in lm.items():
    if n >= cutoff:
      pruned_lm[w] = n
  return pruned_lm
  
def get_lm_from_bow(id_to_bow, ids = None):
  if not ids:
    ids = id_to_bow.keys()
  token_counts = {}
  for i in ids:
    bow = id_to_bow[i]
    for k,n in bow.items():
      if k not in token_counts:
        token_counts[k] = 0
      token_counts[k] += n
  return token_counts

def get_lm_from_tokens(id_to_tokens, ids = None):
  if not ids:
    ids = id_to_tokens.keys()
  token_counts = {}
  for i in ids:
    tokens = id_to_tokens[i]
    for token in tokens:
      if token not in token_counts:
        token_counts[token] = 0
      token_counts[token] += 1
  return token_counts

def get_token_bow(abstract):
  bow = {}
  for token in abstract:
    bow[token] = bow.get(token, 0) + 1
  return bow

def tokenize_abstract(abstract):
  tokens = []
  for paragraph in abstract:
    tokens += [filter(str.isalnum, t) for t in paragraph.lower().split()]
  return tokens
   

def get_articles():
  sex_terms    = [u'Female', u'Male']
  age_terms    = [u'Middle Aged', u'Adult', u'Aged', u'Young Adult', u'Adolescent', u'Aged, 80 and over']
  cancer_terms = [u'Breast Neoplasms', u'Prostatic Neoplasms', u'Lung Neoplasms']

  selected_articles = { term : [] for term in age_terms + sex_terms }

  pkls = glob('%s/*' %PKL_TOP)
  for fname in pkls:
    print 'Loading soup from %s...' %fname
    soup = pkl.load(open(fname, 'rb'))
    for article in soup.MedlineCitationSet.findAll('MedlineCitation'):
      mesh_terms = article.MeshHeadingList.findAll('DescriptorName')
      mesh_terms = [term.string for term in mesh_terms]

      article_age_terms = intersection(age_terms, mesh_terms)
      article_sex_terms = intersection(sex_terms, mesh_terms)
      article_cancer_terms = intersection(cancer_terms, mesh_terms)

      if len(article_cancer_terms) > 0:
        for term in article_age_terms + article_sex_terms:
          selected_articles[term].append(article)

  return selected_articles


def write_article_file(article_dict, max_articles = 200):
  for mesh_key in article_dict:
    abst_dir = '%s/abstracts/%s' %(TOP, mesh_key.replace(' ', '_'))
    info_dir = '%s/info/%s' %(TOP, mesh_key.replace(' ', '_'))
    os.system('mkdir -p %s' %(abst_dir))
    os.system('mkdir -p %s' %(info_dir))

    articles = article_dict[mesh_key]
    random.shuffle(articles)
    n_articles = min(max_articles, len(articles))
    coterms = {}
    cochemicals = {}
    print '%s: %d total articles, sampling to %d articles\n\n' %(mesh_key, len(articles), n_articles)

    for i,article in enumerate(articles):

      if i >= n_articles:
        continue

      article_id = article.PMID.text
      abst_fp = open('%s/%s.txt' %(abst_dir, article_id), 'w')
      info_fp = open('%s/%s.txt' %(info_dir, article_id), 'w')

      mesh_terms = article.MeshHeadingList.findAll('DescriptorName')
      mesh_terms = [term.string for term in mesh_terms]

      try:
        chemicals = article.ChemicalList.findAll('NameOfSubstance')
        chemicals = [chem.string for chem in chemicals]
      except AttributeError:
        chemicals = []

      info_fp.write('MeSH terms: %s\n' %(', '.join(mesh_terms)))
      info_fp.write('Chemicals: %s\n' %(', '.join(chemicals)))

      for term in mesh_terms:
        coterms[term] = coterms.get(term, 0) + 1
      for chem in chemicals:
        cochemicals[chem] = cochemicals.get(chem, 0) + 1
      
      title = article.ArticleTitle.string
      abst_fp.write('%s\n\n' %title.encode('ascii', 'ignore'))
  
      abstract = article.Abstract
      if abstract != None:
        for paragraph in abstract.findAll('AbstractText'):
          try:
            label = paragraph['Label']
            abst_fp.write('%s:\n' %label)
          except KeyError:
            pass
          try:
            abst_fp.write('%s\n' %paragraph.string.encode('ascii', 'ignore'))
          except AttributeError:
            pass

  
  #coterm_thresh = 0.1
  #fp_out.write('Co-occurring MeSH terms (in at least %.02f%% of the articles)\n' %(coterm_thresh*100))
  #for k,v in sorted(coterms.items(), key = lambda (k,v): -v):
  #  if v > len(articles)*coterm_thresh:
  #    fp_out.write('[%d/%d] %s\n' %(v, len(articles), k))

  #chemical_thresh = 0.05
  #fp_out.write('Chemicals (in at least %.02f%% of the articles)\n' %(chemical_thresh*100))
  #for k,v in sorted(cochemicals.items(), key = lambda (k,v):- v):
  #  if v > len(articles)*chemical_thresh:
  #    fp_out.write('[%d/%d] %s\n' %(v, len(articles), k))

if __name__ == '__main__':
  fnames = sys.argv[1:]
  for fname in fnames:
    write_working_data(fname)
