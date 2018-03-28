from __future__ import print_function
import json
import sys
from flask import Flask
from flask import render_template
import pandas as pd

app = Flask(__name__)

def eprint(*args, **kwargs):
  print(*args, file=sys.stderr, **kwargs)

@app.route("/")
def index():
    df = pd.read_csv('some_articles.csv', sep = '\t', error_bad_lines = False)
    article_data = df.to_dict(orient='records')
    article_data = json.dumps(article_data, indent=2)
    eprint(article_data)   
    data = {'articles': article_data}
    return render_template("index.html", data=data)

if __name__ == "__main__":
    app.run(host='0.0.0.0',port=5000,debug=True)
