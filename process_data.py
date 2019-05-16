import cPickle as pkl
from glob import glob
from collections import namedtuple, defaultdict, Counter
import matplotlib.pyplot as plt
import itertools, math, random
from time import strptime, strftime

import nltk
from sklearn.linear_model import LogisticRegression
from sklearn_crfsuite import metrics

import utils
reload(utils)
from utils import *

YEARS = range(1975, 2013)

def get_label(article):
  mesh = [m.text for m in article.mesh]
  m = 'Male' in mesh
  f = 'Female' in mesh
  if m and not f:
    return 'M'
  if f and not m:
    return 'F'
  return 'X'

FEATURE_NAMES = []

def get_features(article, tokens, journal_vocab, country_vocab, mesh_vocab, token_vocab):
  features = []

  global FEATURE_NAMES
  UPDATE_NAMES = (len(FEATURE_NAMES) == 0)

  features += [int(article.date.year) == _y for _y in YEARS]
  if UPDATE_NAMES:
    FEATURE_NAMES += ['Year: %d' %_ for _ in YEARS]

  features += [_j == article.journal.title for _j in journal_vocab]
  if UPDATE_NAMES:
    FEATURE_NAMES += ['Journal: %s' %_ for _ in journal_vocab]

  features += [_c == article.country for _c in country_vocab]
  if UPDATE_NAMES:
    FEATURE_NAMES += ['Country: %s' %_ for _ in country_vocab]

  ts = set(tokens)
  features += [t in ts for t in token_vocab]
  if UPDATE_NAMES:
    FEATURE_NAMES += ['Token: %s' %_ for _ in token_vocab]

  mesh = set([m.text for m in article.mesh])
  for prefix in 'DGMN':
    features += [m in mesh for m in mesh_vocab[prefix]]
    if UPDATE_NAMES:
      FEATURE_NAMES += ['Mesh_%s: %s' %(prefix, _) for _ in mesh_vocab[prefix]]

  return features

def tokenize_articles(articles):
  return { a.PMID : nltk.word_tokenize(a.abst) for a in articles }

def get_token_vocab(tokenized_articles, cutoff_freq = 0.01):
  vocab = {}
  for pmid, a in tokenized_articles.items():
    for token in a:
      if token not in vocab:
        vocab[token] = 0
      vocab[token] += 1
  cutoff_count = len(articles) * cutoff_freq
  return cutoff_counts(vocab, cutoff_count)

def get_mesh_vocab(articles, mt, cutoff_freq = 0.001):
  vocab = {}
  for a in articles:
    for m in a.mesh:
      t = mt.get_mesh(m)
      if t:
        prefixes = set([pos[0] for pos in t.tree_numbers])
        for prefix in prefixes:
          if prefix not in vocab:
            vocab[prefix] = {}
          if t.name not in vocab[prefix]:
            vocab[prefix][t.name] = 0
          vocab[prefix][t.name] += 1
  cutoff_count = len(articles) * cutoff_freq
  return { prefix: cutoff_counts(v, cutoff_count) for prefix, v in vocab.items() }

def get_mesh_pmids(mesh, articles, mesh_tree):
  target_mesh = mesh_tree.name_to_ui[mesh]
  acceptable_mesh = set([target_mesh]).union(mesh_tree.get_descendants(target_mesh))
  has_mesh = lambda a: any([m.UI in acceptable_mesh for m in a.mesh])
  return [a.PMID for a in articles if has_mesh(a)]

def get_top_coefs(lr, names, t_i):
  for i, coef in enumerate(lr.coef_):
    if i != t_i:
      continue
    p_weights = {}
    for x, f in zip(coef, names):
      p = f.split(':')[0]
      if p not in p_weights:
        p_weights[p] = []
      p_weights[p].append((x,f))
    for p, weights in p_weights.items():
      if p != 'Mesh_D':
        continue
      weights = sorted(weights)
      return [lpad(' '.join(f.split(': ')[1].split(' ')[:2]) %x if x > 0.1 else '', 30) for x,f in weights[-10:][::-1]]
      
def per_year(pmids, articles, article_tokens, journal_vocab, country_vocab, mesh_vocab, token_vocab, lrs = None):
  if not lrs:
    y_pmids = {}
    for y in YEARS:
      y_pmids[(y+5)/10] = []
    lrs = {}
    for p in pmids:
      y_pmids[(int(articles[p].date.year)+5)/10].append(p)
    for y, y_ps in sorted(y_pmids.items()):
      print y*10-5
      lrs[y] = (predict_gender(y_ps, articles, article_tokens, journal_vocab, country_vocab, mesh_vocab, token_vocab), len(y_ps))
  
  for t_i in range(3):
    words = []
    for y in sorted(lrs.keys()):
      print y*10-5
      (lr, names), n_arts = lrs[y]
      words.append(get_top_coefs(lr, names, t_i))
    for row in zip(*words):
      print ' '.join(row)

  return lrs


def predict_gender(pmids, articles, article_tokens, journal_vocab, country_vocab, mesh_vocab, token_vocab):
  pmids = shuffled([p for p in pmids if articles[p].journal])
  train_size = int(len(pmids)*0.8)

  print 'Computing test/train features'
  train_pmids = pmids[:train_size]
  train_X = [get_features(articles[p], article_tokens[p],\
                      journal_vocab, country_vocab, mesh_vocab, token_vocab) \
                      for p in train_pmids]
  train_Y = [get_label(articles[p]) for p in train_pmids]

  test_pmids = pmids[train_size:]
  test_X = [get_features(articles[p], article_tokens[p],\
                      journal_vocab, country_vocab, mesh_vocab, token_vocab) \
                      for p in test_pmids]
  test_Y = [get_label(articles[p]) for p in test_pmids]

  print 'Fitting LR on %d points' %len(train_pmids)
  lr = LogisticRegression(penalty='l2', solver='sag', n_jobs=-1)
  lr.fit(train_X, train_Y)

  print 'Evaluating LR on %d points' %len(test_pmids)
  pred_Y = lr.predict(test_X)
  print(metrics.flat_classification_report(test_Y, pred_Y, labels=sorted(set(test_Y)), digits=3))

  #print_top_coefs(lr)
  return lr, FEATURE_NAMES


def year_pkl_name(y):
  return '%s/data/working_dir/%d_articles.pkl' %(TOP, y)

def read_years():
  for year in YEARS:
    year_dir = 'data/articles/%d/' %year
    print 'Reading files in %s' %year_dir
    articles = [pkl.load(open(f, 'rb')) for f in glob('%s/*' %year_dir)]
    write_pkl(year_pkl_name(year), articles)

def mesh_to_sex(mesh):
  m = 'Male' in mesh
  f = 'Female' in mesh
  if m and not f:
    return 'M'
  if f and not m:
    return 'F'
  else:
    return 'X'

def load_articles():
  return sum([load_pkl(year_pkl_name(y), True) for y in YEARS], [])

def load_mesh_tree():
  return load_pkl('%s/data/mesh_tree.pkl' %TOP)

SEP1 = '\t'
SEP2 = '|'

def write_article_csv(articles):
  header = ['pmid', 'date', 'journal', 'country', 'label', 'mesh']
  formatters = {
                 'pmid' : lambda s: 'P'+s,
                 'date' : lambda s: s.year,
                 'journal': lambda s: s.title if s else '<MISSING>',
                 'country': lambda s: s,
                 'label': lambda s: s,
                 'mesh': lambda s: SEP2.join(['%s' %m.uid for m in s]),
               }
  with open('articles.csv', 'w') as fp:
    fp.write(SEP1.join(header))
    for a in articles:
      a_dict = a._asdict()
      a_dict['country'] = a.Country
      a_dict['pmid'] = a.PMID
      a_dict['label'] = mesh_to_sex([m.text for m in a.mesh])
      fields = [formatters[f](a_dict[f]).encode('ascii', 'replace') for f in header]
      fp.write('\n' + SEP1.join(fields))


def write_mesh_csv(meshTree):
  header = ['name', 'uid', 'treepos', 'children']
  formatters = {
    'name': lambda m: m.name,
    'uid': lambda m: m.UI,
    'treepos': lambda m: SEP2.join(m.tree_numbers),
    'children': lambda m: SEP2.join(list(set([_m.UI for _m in meshTree.get_children(m)]))),
    }
  with open('mesh.csv', 'w') as fp:
    fp.write(SEP1.join(header))
    for m in meshTree.mesh:
      fields = [formatters[f](m).encode('ascii', 'replace') for f in header]
      fp.write('\n' + SEP1.join(fields))

def get_mesh_to_pmids(articles, mesh_tree):
  mesh_to_pmids = { m.UI: [] for m in mesh_tree.mesh }
  for a in articles:
    for m in a.mesh:
      if m.UI in mesh_to_pmids:
        mesh_to_pmids[m.UI].append(a.PMID)
  return mesh_to_pmids

def write_mesh_to_pmids(articles, mesh_tree):
  mesh_to_pmids = get_mesh_to_pmids(articles, mesh_tree)
  with open('mesh_to_pmids.csv', 'w') as fp:
    fp.write(SEP1.join(['uid', 'pmids']))
    for uid, pmids in mesh_to_pmids.items():
      fp.write('\n' + SEP1.join([uid, SEP2.join(['P'+p for p in pmids])]))


def score_counts((m_count, f_count)):
  return log_or_0(m_count, f_count)

class MeshTree:
  def __init__(self, mesh):
    self.mesh = mesh
    self.ui_to_name = { m.UI: m.name for m in mesh }
    self.name_to_ui = { m.name: m.UI for m in mesh }
    self.ui_to_mesh = { m.UI: m for m in mesh }
    self.name_to_mesh = { m.name: m for m in mesh }
    self.tree_to_mesh = { pos: m for m in mesh for pos in m.tree_numbers }
    self.tree_pos_children = defaultdict(list)
    for m in mesh:
      for tree_pos in m.tree_numbers:
        if tree_pos.count('.'):
          parent, ext = tree_pos.rsplit('.', 1)
          self.tree_pos_children[parent].append(tree_pos)
    self.name_to_hist_names = { m.name: [txt.rsplit(' ', 1) for txt in m.prev_indexing] for m in mesh }


  def get_mesh(self, text):
    if type(text) in [str, unicode]:
      if text[0] == 'D' and text[1:].isdigit():
        target_d = self.ui_to_mesh
      else:
        target_d = self.name_to_mesh
    else:
      text = text.UI
      target_d = self.ui_to_mesh

    try:
      mesh = target_d[text]
      return mesh
    except KeyError:
      #print 'NO MESH TREE ENTRY FOR %s' %str(text)
      return None

  def are_related(self, m1, m2):
    mesh1 = self.get_mesh(m1)
    mesh2 = self.get_mesh(m2)
    return any([t1.startswith(t2) for t1,t2 in itertools.permutations(mesh1.tree_numbers + mesh2.tree_numbers, 2)])

  def get_parents(self, mesh_term):
    return [tree_pos.rsplit('.', 1)[0] for tree_pos in self.get_mesh(mesh_term).tree_numbers]

  def get_children(self, mesh_term):
    return [self.tree_to_mesh[child] \
                     for pos in self.get_mesh(mesh_term).tree_numbers \
                     for child in self.tree_pos_children[pos]]

  def get_descendants(self, mesh_term):
    m = self.get_mesh(mesh_term)
    nodes = []
    fringe = self.get_children(m)
    while fringe:
      cur_node = fringe.pop(0)
      if cur_node not in nodes:
        nodes.append(cur_node)
        fringe += self.get_children(cur_node)
    return [n.UI for n in nodes]

  def get_roots(self, prefix = 'C'):
    return [m for m in self.mesh if any([pos.count('.') == 0 and pos[0] == prefix for pos in m.tree_numbers])]

def compute_data(articles, mesh_tree):

  print 'building mesh -> pmids'
  mesh_to_pmids = { m.UI: [] for m in mesh_tree.mesh }
  for a in articles:
    for m in a.mesh:
      if m.UI in mesh_to_pmids:
        mesh_to_pmids[m.UI].append(a.PMID)

  print 'building pmid -> label'
  pmid_to_label = {}
  for a in articles:
    pmid_to_label[a.PMID] = mesh_to_sex([m.text for m in a.mesh])

  print 'building mesh -> descendants'
  mesh_to_descendants = { m.UI: mesh_tree.get_descendants(m) for m in mesh_tree.mesh }

  print 'building mesh -> score'
  mesh_to_score = {}
  for ui, pmids in mesh_to_pmids.items():
    mesh_to_score[ui] = Counter([pmid_to_label[pmid] for pmid in pmids])

  print 'building node -> pmids'
  node_to_pmids = {}
  for ui, ui_ds in mesh_to_descendants.items():
    pmids = set(mesh_to_pmids[ui])
    for ui_d in ui_ds:
      pmids.update(mesh_to_pmids[ui_d])
    node_to_pmids[ui] = pmids

  print 'building node -> score'
  node_to_score = {}
  for ui, pmids in node_to_pmids.items():
    counts = { y: [0.0, 0.0] for y in YEARS }
    for pmid in pmids:
      y = int(pmid_to_year[pmid])
      counts[y][0] += pmid_to_count[pmid][0]
      counts[y][1] += pmid_to_count[pmid][1]
    node_to_score[ui] = counts

  return locals()

def plot_data(input_vars):
  globals().update(input_vars)

  keys = [m.UI for m in mesh_tree.mesh]
  X = [len(node_to_pmids[k]) for k in keys]
  Y = [[node_to_score[k][y] for y in YEARS] for k in keys]

  use_target_mesh = bool(input_vars.get('target_mesh_name', None))

  if use_target_mesh:
    print 'Restricting points to descendands of %s' %target_mesh_name
    target_mesh = mesh_tree.name_to_ui[target_mesh_name]
    acceptable_mesh = [target_mesh] + mesh_tree.get_descendants(target_mesh)
    pt_filter = lambda (x,y,k): k in acceptable_mesh and x > 50
  else:
    pt_filter = lambda (x,y,k): x > 1000

  X, Y, K = zip(*filter(pt_filter, zip(X,Y,keys)))

  x_func = math.log
  x_func = lambda x: x#math.log
  y_func = lambda y_counts: log_or_0(*map(sum, zip(*y_counts)))
  X, Y = map(x_func, X), map(y_func, Y)

  plt.ion()
  plt.show()

  if use_target_mesh:
    fig, [ax, ax2] = plt.subplots(1,2)
  else:
    fig, ax = plt.subplots()

  for x,y,k in zip(X,Y,K):
    ax.annotate(mesh_tree.ui_to_name[k], (x,y), bbox=dict(boxstyle='round,pad=0.2', fc='yellow', alpha=0.1))
  ax.plot([min(X), max(X)], [0.0, 0.0])
  ax.scatter(X, Y)

  
  ratios = [10.0, 5.0, 4.0, 3.0, 2.0, 1.5, 1.25, 1.125]
  ratios = [(1.0, r) for r in ratios if log_or_0(1.0,r) < max(Y)] + \
           [(r, 1.0) for r in ratios if log_or_0(r,1.0) > min(Y)] + [(1.0, 1.0)]
  ax.set_yticks([log_or_0(*r) for r in ratios])
  ax.set_yticklabels(['%.0f%%' %((max(m,f)/min(m,f)-1.0)*100.0) for m,f in ratios], rotation = 20)
  x_range = max(X) - min(X)
  x_step = int(x_range / 10.0)
  doc_counts = map(lambda x: x/1000*1000, range(min(X) - x_step, max(X) + x_step, x_step))
  ax.set_xticks(map(x_func, doc_counts))
  ax.set_xticklabels(['{:,}'.format(x) for x in doc_counts], rotation = 45)
  ax.set_ylabel('Log(# males / # females)')
  ax.set_xlabel('Number of occurences of MeSH tag')

  if use_target_mesh:
    x = YEARS
    y = [log_or_0(*node_to_score[target_mesh][year]) for year in YEARS]
    ax2.plot(x, y, label = target_mesh)
    ax2.set_ylabel('Log(# males / # females)')

  plt.draw()
  response = raw_input('New target MeSH? ')
  plt.close()

  if response:
    input_vars['target_mesh_name'] = response
    plot_data(input_vars)
  
  if 'target_mesh_name' in input_vars:
    del input_vars['target_mesh_name']

def get_disease_pmids(articles):
  tag_genre_mapping = {
# Autistic
    'Autistic Disorder':'Autistic',
    'Child Development Disorders Pervasive':'Autistic',
    'Psychiatric Status Rating Scales':'Autistic',
    'Neuropsychological Tests':'Autistic',
    'Behavior Therapy':'Autistic',
# Cardiovascular
    'Blood Pressure':'Cardiovascular',
    'Hypertension':'Cardiovascular',
    'Heart Rate':'Cardiovascular',
    'Body Mass Index':'Cardiovascular',
    'Myocardial Infarction':'Cardiovascular',
    'Heart Failure':'Cardiovascular',
    'Antihypertensive Agents':'Cardiovascular',
# Cancer
    'Antineoplastic Combined Chemotherapy Protocols':'Cancer',
    'Breast Neoplasms':'Cancer',
    'Antineoplastic Agents':'Cancer',
    'Neoplasm Staging':'Cancer',
    'Neoplasms':'Cancer',
    'Lung Neoplasms':'Cancer',
    'Neoplasm Recurrence Local':'Cancer'
  }
  disease_pmids = { 'All': set() }
  for d in tag_genre_mapping.values():
    disease_pmids[d] = set()
  for a in articles:
    diseases = set([tag_genre_mapping.get(m.text, 'All') for m in a.mesh])
    for disease in diseases:
      disease_pmids[disease].add(a.PMID)
  return disease_pmids

if __name__ == '__main__':
  articles = load_articles()
  mesh_tree = load_mesh_tree()
