from flask import Flask, render_template

application = Flask(__name__)

@application.route("/")
def home():
   return render_template('Homepage.html')

@application.route('/About')
def About():
   return render_template('About.html')

@application.route('/NormalMap')
def NormalMap():
   return render_template('NormalMap.html')

@application.route('/EnvironmentMap')
def EnvironmentMap():
   return render_template('Teapot.html')

@application.route('/Lumos')
def Lumos():
   return render_template('Lumos.html')

@application.route('/TAV')
def TAV():
   return render_template('TAV.html')

@application.route('/Steganography')
def Steganography():
   return render_template('Steganography.html')

@application.route('/Exegy')
def Exegy():
   return render_template('Exegy.html')


if __name__ == "__main__":
   application.run('0.0.0.0', 5000)
