import nltk
import cPickle as pkl

stemmer = nltk.stem.PorterStemmer()
lemmatizer = nltk.wordnet.WordNetLemmatizer()
def stem_abst(abst):
  #return [stemmer.stem(token.lower()) for token in word_tokenize(text)]
  return [lemmatizer.lemmatize(token.lower()) for token in nltk.word_tokenize(abst)]

if __name__ == '__main__':
  id_to_abst = pkl.load(open('id_to_abst.pkl'))
  id_to_stem = { i:stem_abst(abst) for i,abst in id_to_abst.items() }
  pkl.dump(id_to_stem, open('id_to_lemm.pkl', 'w'), pkl.HIGHEST_PROTOCOL)
