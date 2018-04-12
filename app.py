from __future__ import print_function
import json
import sys
from flask import Flask
from flask import render_template
import pandas as pd

app = Flask(__name__)

def eprint(*args, **kwargs):
  print(*args, file=sys.stderr, **kwargs)

def import_csv(fname, split_fields = []):
  df = pd.read_csv(fname, sep = '\t', error_bad_lines = False)
  df = df.fillna('')
  dicts = df.to_dict(orient='records')
  for field in split_fields:
    for d in dicts:
      d[field] = d[field].split('|') or [];
  df_json = json.dumps(dicts, indent=2)
  return df_json

data = {}
def init_data():
  global data
  data = {
    'mesh': import_csv('mesh.csv', ['treepos', 'children']),
    'mesh_to_pmids': import_csv('mesh_to_pmids.csv', ['pmids']),
    'articles': import_csv('articles.csv', ['mesh']),
  }

@app.route("/")
def index():
  return render_template("index.html", data=data)

def csv_to_json(fname):
    df_json = json.dumps(df_dict, indent=2)
    return df_json

if __name__ == "__main__":
    init_data()
    app.run(host='0.0.0.0',port=5000,debug=True)
