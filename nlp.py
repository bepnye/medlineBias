import global_vars
reload(global_vars)
from global_vars import *

import utils
reload(utils)
from utils import *

from operator import itemgetter
from collections import Counter
import matplotlib
matplotlib.use('Agg')
import matplotlib.pyplot as plt
import numpy as np
from scipy.sparse import csr_matrix, vstack, hstack
from sklearn.linear_model import LogisticRegression, RandomizedLogisticRegression
from sklearn.preprocessing import StandardScaler
from sklearn.metrics import confusion_matrix

class Vocab:

  def __init__(self, docs, cutoff_count = 10):
    self.counts = {}
    for doc in docs:
      for token in doc:
	self.counts[token] = self.counts.get(token, 0) + 1
	#self.token_to_idx.setdefault(token, len(self.token_to_idx))

    self.token_to_idx = { OOV:0 }
    for token, count in self.counts.items():
      if count > cutoff_count:
	self.token_to_idx[token] = len(self.token_to_idx)
    self.idx_to_token = { idx:token for token,idx in self.token_to_idx.items() }

    print 'Constructed vocab from %d docs, %d types pruned to %d with cutoff = %d' %( \
	      len(docs),
	      len(self.counts),
	      len(self.token_to_idx),
	      cutoff_count)

  def __len__(self):
    return len(self.token_to_idx)

  def __getitem__(self, item):
    if type(item) == int:
      return self.decode_idx(item)
    if type(item) in [str, unicode]:
      return self.encode_token(item)
    raise TypeError('Can\'t deduce vocab conversion for %s item: %s' %(str(type(item)), str(item)))

  def encode_token(self, token):
    return self.token_to_idx.get(token, 0)

  def encode_tokens(self, tokens):
    return map(self.encode_token, tokens)

  def decode_idx(self, idx):
    return self.idx_to_token.get(idx, OOV)

def encode_docs(vocab, docs):
  counts = {}
  for row_idx, doc in enumerate(docs):
    for token in doc:
      col_idx = vocab[token]
      key = (row_idx, col_idx)
      counts[key] = counts.get(key, 0) + 1
  data = []
  rows = []
  cols = []
  for (r,c),count in counts.items():
    data.append(count)
    rows.append(r)
    cols.append(c)
  return csr_matrix((data, (rows,cols)), dtype=int, shape=(len(docs), len(vocab)))

def encode_doc(vocab, doc):
  return encode_docs(vocab, [doc])

def sex(vocab, mesh_to_id, id_to_toks, target_labels = ('Male', 'Female', 'Both')):
  docs = { 'Both':   intersection(mesh_to_id['Male'], mesh_to_id['Female']),
	   'Female': mesh_to_id['Female'],
	   'Male': mesh_to_id['Male'],
	   'Not_Female': difference(id_to_toks.keys(), mesh_to_id['Female']),
	   'Not_Male': difference(id_to_toks.keys(), mesh_to_id['Male']) }
  print 'Encoding train docs...'
  Xs = { label: encode_docs(vocab, [id_to_toks[i] for i in docs[label]]) for label in target_labels }

  return run_logreg(*get_test_train(target_labels, Xs, 0.8))

def get_test_train(labels, ids, Xs, split_qty, test_idx = None):
  if test_idx == None:
    test_idx = split_qty - 1
  train_ids = []
  test_ids = []

  print 'Dividing test/train for labels: ', ', '.join(labels)
  mats = []
  idxs = []
  for i,label in enumerate(labels):
    i_chunks = get_chunks(ids[label], split_qty)
    X_chunks = [vstack(chunk) for chunk in get_chunks(Xs[label], split_qty)]
    X_tr_mat, X_te_mat = get_fold(X_chunks, test_idx)
    i_tr_mat, i_te_mat = get_fold(i_chunks, test_idx)
    mats.append((X_tr_mat, [i]*X_tr_mat.shape[0], X_te_mat, [i]*X_te_mat.shape[0]))
    idxs.append((i_tr_mat, i_te_mat))
    
  X_trs, Y_trs, X_tes, Y_tes = zip(*mats)
  i_trs, i_tes = zip(*idxs)
  
  return stack(X_trs), stack(Y_trs), stack(i_trs), stack(X_tes), stack(Y_tes), stack(i_tes)

def run_logreg(X_train, Y_train, X_test, Y_test, label_map,
	       solve = 'liblinear', classweight = 'balanced', multiclass = 'ovr'):
  print 'Fitting logreg, %d observations with %d features each...' %(X_train.shape[0], X_train.shape[1])
  logreg = LogisticRegression(solver = solve, C = 0.5, penalty = 'l1', class_weight = classweight, multi_class = multiclass)
  logreg.fit(X_train, Y_train)
#  for i in label_map:
#    print 'Finished fitting logreg, %d/%d features selected for %s' %(
#	len([x for x in logreg.coef_[i] if x != 0.0]),
#	len(logreg.coef_[i]),
#	label_map[i])
  return logreg

def evaluate_logreg(logreg, X_train, Y_train, X_test, Y_test, label_map):
  Y_base = [Counter(Y_test).most_common(1)[0][0]]*len(Y_test)
  print 'Computing error...'
  for name,Y_p,Y in [('in-sample', logreg.predict(X_train), Y_train),
		    ('test set', logreg.predict(X_test), Y_test),
		    ('baseline', Y_base, Y_test)]:

    total_correct = len([pair for pair in zip(Y_p,Y) if pair[0]==pair[1]])
    print 'Accuracy for %s:%s %s/%s = %s' %(
	lpad(name, 9),
	lpad('', 7),
	lpad(total_correct, 5),
	rpad(len(Y), 5),
	lpad('%.2f%%' %(100.0*total_correct/len(Y)), 7))
    if name == 'test set':
      print_matrix(Y_p, Y, label_map)
  i_base = [Counter(Y_test).most_common(1)[0][0]]*len(Y_test)

def max_diff_weights(probs, target_label):
  target_prob = probs[target_label]
  other_probs = [probs[i] for i in range(len(probs)) if i != target_label]
  return target_prob - max(other_probs)
def max_div_weights(probs, target_label):
  target_prob = probs[target_label]
  other_probs = [probs[i] for i in range(len(probs)) if i != target_label]
  return target_prob/max(other_probs)

def get_prec_points(X_test, Y_test, logreg, label_map, target_label):
  label_to_idx = {label:i for i,label in label_map.items()}
  target_idx = label_to_idx[target_label]
  Y_probs = logreg.predict_proba(X_test)
  Y_preds = logreg.predict(X_test)
  data = zip(Y_probs, Y_preds, Y_test)
  data = [(probs, yp, yt) for probs,yp,yt in data if yp == target_idx]
  data = sorted(data, key=lambda (probs,y_pred,y_true): -1*max_diff_weights(probs, y_pred))

  N_true = len([y for y in Y_test if y == target_idx])
  N_tagged = len([y for y in Y_preds if y == target_idx])

  print 'Tagged %d docs as %s' %(N_tagged, target_label)

  acc = [data[0][2] == target_idx]
  for probs,yp,yt in data[1:]:
    acc.append(acc[-1]+(yt==target_idx))
  precision = [acc[i]/float(i+1) for i in range(len(acc))]
  recall = [acc[i]/float(N_true) for i in range(len(acc))]
  return range(len(acc)), precision, recall

def plot_prec(X_test, Y_test, logreg, label_map, target_label):
  X,precision,recall = get_prec_points(X_test, Y_test, logreg, label_map, target_label)
  points = zip(X,precision,recall)
  print 'Plotting...'
  X,prec,rec = zip(*points[::len(points)/20])
  fig = plt.figure()
  ax = fig.add_subplot(111)
  for j in range(50,150,5):
    ax.plot([X[0],X[-1]],[j/100.0, j/100.0],color='black')
  ax.plot(X,prec,color='red')
  ax.set_xlim(X[0],X[-1])
  ax.set_ylim(0.3,1.1)
  plt.title('Precision at K for '+target_label+', recall=%.3f'%recall[-1])
  fig.savefig(target_label+'--'+'-'.join(label_map.values()))


def print_matrix(Y_p, Y, label_map):
  label_idxs = { i:label for label,i in label_map.items() }
  conf_matrix = [[0 for _ in label_map] for _ in label_map]
  for pred, true in zip(Y_p, Y):
    conf_matrix[true][pred] += 1
  for i,row in enumerate(conf_matrix):
    print '%s [%s] %s/%s = %s' %(
	lpad(label_map[i], 10),
	' '.join([lpad(d, 5) for d in row]),
	lpad(row[i], 5),
	rpad(sum(row), 5),
	lpad('%.2f%%' %(100.0*row[i]/sum(row)), 8))

def add_conf_matrix(lr_data):
  for suffix in ['tr', 'te']:
    Y_pred = lr_data['logreg'].predict(lr_data['X%s'%suffix])
    Y_true = lr_data['Y%s'%suffix]
    Y_idx  = lr_data['I%s'%suffix]
    conf_mat = [[[] for _ in lr_data['label_map']] for _ in lr_data['label_map']]
    for pred,true,idx in zip(Y_pred, Y_true, Y_idx):
      conf_mat[true][pred].append(idx)
    lr_data['conf_%s'%suffix] = conf_mat
  

def get_held_out_ids(all_ids, ids, split = 0.8):
  labels = ['Only_Female', 'Only_Male', 'Both', 'Neither']
  trains = []
  tests = []
  for label in labels:
    train, test = split_list(ids[label], int(0.8*len(ids[label])))
    trains += train
    tests += test
  print len(trains), len(tests)
  return trains, tests

def get_label_ids_age(vocab, mesh_to_id, id_to_toks):
  All = list(id_to_toks.keys())

  ids = {}
  for tag in AGE_TERMS:
    ids[tag] = list(mesh_to_id[tag])
    ids['Not_'+tag] = difference(All, ids[tag])
  
  for label,target_ids in sorted(ids.items(), key = lambda (k,lst): len(lst)):
    print 'Found %s/%s (%%%.2f) docs with label %s' %(
			    lpad(len(target_ids), 4),
			    len(All),
			    100.0*len(target_ids)/len(All),
			    label)

  for label in ids:
    ids[label] = sorted(ids[label])
  #train_ids, test_ids = get_held_out_ids(All, ids)
  train_ids, test_ids = [], []

  return ids, train_ids, test_ids

def get_label_ids(vocab, mesh_to_id, id_to_toks):
  ids = {}
  All = list(id_to_toks.keys())
  Female = list(set(mesh_to_id['Female']))
  Male   = list(set(mesh_to_id['Male']))

  ids['Female'] = Female
  ids['Not_Female'] = difference(All, Female)

  ids['Male'] = Male
  ids['Not_Male'] = difference(All, Male)

  ids['Either'] = union(Female, Male)
  ids['Neither'] = difference(All, union(Male, Female))

  ids['Both']   = intersection(Female, Male)

  ids['Only_Female'] = difference(Female, Male)
  ids['Only_Male']   = difference(Male, Female)
  ids['Only_One']    = sym_diff(Female, Male)
  ids['Not_Only_Male'] = difference(All, difference(Male, Female))
  ids['Not_Only_Female'] = difference(All, difference(Female, Male))
  
  for label,target_ids in sorted(ids.items(), key = lambda (k,lst): len(lst)):
    print 'Found %s/%s (%%%.2f) docs with label %s' %(
			    lpad(len(target_ids), 4),
			    len(All),
			    100.0*len(target_ids)/len(All),
			    label)

  for label in ids:
    ids[label] = sorted(ids[label])
  #train_ids, test_ids = get_held_out_ids(All, ids)
  train_ids, test_ids = [], []

  return ids, train_ids, test_ids

def encode_ids_bow(vocab, ids, id_to_toks):
  print 'Encoding train docs...'
  id_to_vec = { i: encode_doc(vocab, tokens) for i,tokens in id_to_toks.items() }
  Xs = {}
  for label, id_list in ids.items():
    Xs[label] = [id_to_vec[i] for i in id_list]
  return Xs

def encode_ids_d2v(model, ids, id_to_toks):
  print 'Encoding train docs...'
  id_to_vec = { i: model.infer_vector(tokens) for i,tokens in id_to_toks.items() }
  Xs = {}
  for label, id_list in ids.items():
    print 'Compositing vecs for %s...' %label
    X_vecs = [id_to_vec[i] for i in id_list]
    Xs[label] = np.stack(X_vecs)
  return Xs

def sex_train_components(vocab, Xs, label_pairs = None, print_weights = True):
  logregs = {}

  if not label_pairs:
    label_pairs = [('Female', 'Not_Female'),
		   ('Male', 'Not_Male'),
		   ('Either', 'Neither'),
		   ('Both', 'Only_One'),
		   ('Both', 'Only_Female'),
		   ('Both', 'Only_Male'),
		   ('Only_Female', 'Not_Only_Female'),
		   ('Only_Male', 'Not_Only_Male')]
  for labels in label_pairs:
    logregs[','.join(labels)] = run_logreg(*get_test_train(labels, Xs, 0.8))

  if print_weights:
    for name,logreg in logregs.items():
      coef_weights = [(vocab[i], x) for i,x in sorted(enumerate(logreg.coef_[0]), key = lambda (k,v): -1*v)]
      print 'Top weights for ', name
      for word,weight in coef_weights[:10]:
	print '%s %s' %(lpad('%.3f' %weight, 6), word)
      print 'Bottom weights for ', name
      for word,weight in coef_weights[-10:][::-1]:
	print '%s %s' %(lpad('%.3f' %weight, 6), word)

  return logregs

def sex_train_ensemble(logregs, Xs,
      target_labels = ('Only_Male', 'Only_Female', 'Both'), target_label=None):
  Xps = {}
  for label in target_labels:
    print 'Updating X for ', label
    X_probs = [csr_matrix(logreg.predict_proba(Xs[label])) for name,logreg in logregs.items()]
    Xps[label] = csr_matrix(hstack(X_probs+[Xs[label]]))
  Xtr, Ytr, Xte, Yte, label_map = get_test_train(target_labels, Xps, 0.8)
  print 'Running multiclass ensemble: train = %d, test = %d' %(len(Ytr), len(Yte))
  logreg = run_logreg(Xtr, Ytr, Xte, Yte, label_map,
		      solve='lbfgs', classweight = None, multiclass = 'multinomial')
  plot_prec(Xte, Yte, logreg, label_map, target_label or target_labels[0])
  return logreg

def get_sex_ids(valid_ids, mesh_to_id):
  Male = intersection(mesh_to_id['Male'], valid_ids)
  Female = intersection(mesh_to_id['Female'], valid_ids)
  All = valid_ids
  ids = { 'Male' :   difference(Male, Female),
	  'Female' : difference(Female, Male),
	  'Both' :   intersection(Male, Female) }
	  #'None' :   intersection(difference(All, Male), difference(All, Female)) }
  return ids

def plot_disease_bias(mesh_to_ids, ids_to_mesh):
  tags = ['Depression', 'Diabetes Mellitus, Type 2', 'Obesity', 'Alcohol Drinking']
  years = sorted(mesh_to_ids.keys())
  ratios = { tag: [] for tag in tags }
  for tag in tags:
    for year in years:
      Male = mesh_to_ids[year]['Male']
      Female = mesh_to_ids[year]['Female']
      Tag = mesh_to_ids[year][tag]
      m_count = intersection(Male, Tag)
      f_count = intersection(Female, Tag)
      if (m_count+f_count):
	ratio = float(len(f_count)) / float(len(m_count))
      else:
	ratio = 0.0
      ratios[tag].append(ratio)
  fig = plt.figure()
  ax = fig.add_subplot(111)
  title = 'Gender ratios (f to m)'
  for tag in tags:
    print tag, len(years), len(ratios[tag])
    r = ratios[tag]
    smoothed = [np.mean(r[i-2:i+1]) for i in range(len(r))]
    ax.plot(years, smoothed, label=tag, lw=2)
  plt.legend(loc='best')
  plt.title(title)
  print 'Saving plot for %s' %title
  fig.savefig('%s.png' %title.replace(' ', '_'))


def get_tags_ids(valid_ids, mesh_to_id, target_tags):
  target_ids = list(set.union(*[set(mesh_to_id[tag]) for tag in target_tags]))
  ids = { '%s+%d' %(target_tags[0], len(target_tags)-1) : target_ids,
	  'None' : difference(valid_ids, target_ids) }
  return ids

def get_basic_Xs(valid_ids, id_to_vec, mesh_to_id, required_tags = None, shuffle = False,
		 get_ids = get_sex_ids):
  ids = get_ids(valid_ids, mesh_to_id)

  if required_tags:
    required_tag_ids = set.union(*[set(mesh_to_id[tag]) for tag in required_tags])
    for label in ids:
      ids[label] = intersection(required_tag_ids, ids[label])

  if shuffle:
    for label in ids:
      ids[label] = shuffled(ids[label])

  for l,x in ids.items():
    print l, len(x), round(float(len(x))/float(sum(map(len, ids.values()))), 2)
  Xs = { label : [id_to_vec[i] for i in ids[label]] for label in ids }
  return Xs, ids

def all_evaluate_stability(vocabs, ids_to_vec, ids_to_mesh, mesh_to_ids):
  results = {}
  for year in vocabs.keys():
    print 'Cecking year=%d' %year
    scores = evaluate_stability(vocabs[year], ids_to_vec[year], mesh_to_ids[year])
    results[year] = scores
  return results

def evaluate_stability(vocab, id_to_vec, mesh_to_id):
  labels = ('Male', 'Female', 'Both')
  Xs, ids = get_basic_Xs(id_to_vec, mesh_to_id, shuffle = True)
  Xtr, Ytr, Itr, Xte, Yte, Ite = get_test_train(labels, ids, Xs, 5)
  print 'Fitting RandomizedLR...'
  logreg = RandomizedLogisticRegression(verbose = True, n_resampling = 1000, n_jobs = 16)
  logreg.fit(Xtr, Ytr)
  scores = logreg.scores_
  return { vocab[i]: score for i,score in enumerate(scores) }

def run_all_years(vocab, ids_to_vec, ids_to_mesh, mesh_to_ids,
  years = None, logreg = None, req_tags = None, combine_test_train = False,
  valid_ids = None, ids_func = get_sex_ids):

  ret_data = {}
  years = years or sorted(mesh_to_ids.keys())

  Xs_ids = [get_basic_Xs(valid_ids or ids_to_vec[y].keys(), ids_to_vec[y], mesh_to_ids[y], required_tags=req_tags, get_ids = ids_func) \
		for y in years]
  labels = Xs_ids[0][1].keys()
  label_map = dict(enumerate(labels))
  test_train = [get_test_train(labels, ids, Xs, 5) for (Xs,ids) in Xs_ids]
  Xtr, Ytr, Itr, Xte, Yte, Ite = map(stack, zip(*test_train))
  if combine_test_train:
    Xte = stack([Xte, Xtr])
    Yte = stack([Yte, Ytr])
    Ite = stack([Ite, Itr])

  if not logreg:
    logreg = run_logreg(Xtr, Ytr, Xte, Yte, label_map)
  evaluate_logreg(logreg, Xtr, Ytr, Xte, Yte, label_map)

  #_,m_prec,_= get_prec_points(Xte, Yte, logreg, label_map, 'Male')
  #_,f_prec,_= get_prec_points(Xte, Yte, logreg, label_map, 'Female')

  w_coefs = { vocab[i]: coefs for i,coefs in enumerate(zip(*logreg.coef_)) }

  for name in ['Xtr', 'Ytr', 'Itr', 'Xte', 'Yte', 'Ite', 'logreg', 'label_map', 'w_coefs']:
    ret_data[name] = eval(name)
  add_conf_matrix(ret_data)

  return ret_data


class LM:

  def __init__(self, vocab, docs):
    self.vocab = vocab
    self.freq = {}

def plot(Xs,Ys,title,fname, colors=None, labels=None, xlim=None, ylim=None):
  fig = plt.figure()
  ax = fig.add_subplot(111)
  for i in range(len(Xs)):
    c = colors[i] if colors else 'blue'
    l = labels[i] if labels else ''
    ax.plot(Xs[i], Ys[i], c=c, label=l, lw=2)
  if xlim:
    ax.set_xlim(xlim)
  if ylim:
    ax.set_ylim(ylim)
  if labels:
    plt.legend(loc=3)
  plt.title(title)
  print 'Saving plot to %s.png' %fname
  fig.savefig('%s.png' %fname)
  plt.close()
