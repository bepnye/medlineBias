from collections import namedtuple

#TARGET_TOP = '/scratch-shared/users/bennye/medline/'
MESH_DIVIDER = '|'
TOP = '/Users/ben/Desktop/medlineBias/'
#SOURCE_TOP = '/home1/b/bennye/xml_source/'
SOURCE_TOP = '%s/data/xml_files/' %TOP
XML_TOP    = '%s/data/all_xml/' %TOP
PKL_TOP    = '%s/data/all_pkl/' %TOP
TXT_TOP    = '%s/txt/' %TOP
ARTICLE_TOP    = '%s/data/articles/' %TOP
MESH_TOP   = '%s/mesh/' %TOP
OOV = '<OOV>'
AGE_RANGES = { 'Infant' :	     [ 0,  1],
	       'Child, Preschool' :  [ 2,  5],
	       'Child' :	     [ 6, 12],
	       'Adolescent' :	     [13, 18],
	       'Young Adult' :	     [19, 24],
	       'Adult' :	     [19, 44],
	       'Middle Aged' :	     [45, 64],
	       'Aged' :		     [65, 79],
	       'Aged, 80 and over' : [80, 100] }
AGE_TERMS = AGE_RANGES.keys()
SEX_TERMS = ['Male', 'Female']

Date = namedtuple('Date', 'year month')
MeshTerm = namedtuple('MeshTerm', 'UI text is_major quals')
Author = namedtuple('Author', 'last_name first_name initials')
Journal = namedtuple('Journal', 'title issn')
Article = namedtuple('Article', 'PMID abst date mesh authors journal pub_types Country Affiliation')

MeshTreeTerm = namedtuple('MeshTreeTerm', 'UI name quals tree_numbers pref_concept prev_indexing')
