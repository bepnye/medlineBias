import cPickle as pkl
from scipy.sparse import csr_matrix, vstack, hstack
from itertools import chain, combinations
from random import sample
from math import log

import global_vars
reload(global_vars)
from global_vars import *

def get_vocab(tokens, cutoff_freq):
  v = {}
  for t in tokens:
    if t not in v:
      v[t] = 0
    v[t] += 1
  cutoff_count = len(tokens) * cutoff_freq
  return sorted(cutoff_counts(v, cutoff_count).keys())

def cutoff_counts(d, thresh = 5):
  return { k: v for k,v in d.items() if v > thresh }

def write_pkl(fname, data, VERBOSE = False):
    if VERBOSE:
      print 'Writing %s...' %fname
    with open(fname, 'w') as fp:
      pkl.dump(data, fp, pkl.HIGHEST_PROTOCOL)

def load_pkl(fname, VERBOSE = False):
  if VERBOSE:
    print 'Loading %s...' %fname
  return pkl.load(open(fname, 'rb'))

def contains_any(search_terms):
  return lambda i,terms: any([t in terms for t in search_terms])
def contains_all(search_terms):
  return lambda i,terms: all([t in terms for t in search_terms])

def remove_tags(string):
  p = re.compile(r'<.*?>')
  return p.sub('', string).strip()

def intersection(l1, l2):
  return list(set(l1).intersection(l2))

def union(l1, l2):
  return list(set(l1).union(l2))

def difference(l1, l2):
  return list(set(l1).difference(l2))

def sym_diff(l1, l2):
  return list(set(l1).symmetric_difference(l2))

def split_list(l, idx):
  return l[:idx], l[idx:]

def shuffled(l):
  return sample(l, len(l))

def rpad(s, n, c = ' '):
  s_str = str(s)
  if 'e-' in s_str and type(s) == float:
    s_str = '%f' %s
  return s_str + c*(n - len(s_str))

def lpad(s, n, c = ' '):
  s_str = str(s)
  if 'e-' in s_str and type(s) == float:
    s_str = '%f' %s
  return c*(n - len(s_str)) + s_str

def powerset(s_in, R = None):
  s = list(s_in)
  if not R:
    R = len(s)
  return chain.from_iterable(combinations(s, r) for r in range(R+1))

def get_chunks(l, n):
  step = float(len(l)+1)/n
  return [l[int(round(step*i)): int(round(step*(i+1)))] for i in range(n)]

def merge_dicts(dicts, join_func = union, default_obj = set()):
  merged = {}
  for d in dicts:
    for k in d:
      merged[k] = join_func(d[k], merged.get(k, default_obj))
  return merged

def nnz(l):
  return len([x for x in l if x != 0.0])

def stack(l):
  elem_type = type(l[0])
  if elem_type == list:
    return list(chain.from_iterable(l))
  elif elem_type == csr_matrix:
    return vstack(l)
  else:
    raise Exception('Dunno how to stack a %s' %(str(type(l))))

def get_fold(l, i):
  return stack(l[:i]+l[i+1:]), l[i]

def log_or_0(num,den):
  return log(num/den) if num and den else 0.0

def div_or_0(num,den):
  return num/den if num and den else 0.0

def dist(X,Y):
  return sum([(x-y)**2 for x,y in zip(X,Y)])**0.5
