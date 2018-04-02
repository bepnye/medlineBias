#TARGET_TOP = '/scratch-shared/users/bennye/medline/'
SOURCE_TOP = '/nlp/data/corpora/medline_data/xml_files/'
TOP = '/home1/b/bennye/medline'
XML_TOP = '%s/xml' %TOP
PKL_TOP = '%s/pkls' %TOP
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
