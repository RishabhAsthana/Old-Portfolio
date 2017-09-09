Setting up the reverse proxy server
===================


Our Flask application would be served by a **uwsgi** application server, which will communicate with a **nginx** server via a unix socket. We also need to setup **systemd** to launch the **uwsgi** process(es) when the server boots.

----------


### Installation
Install the required packages (for a debian based distro, like raspbian) using commands as follows:

```
sudo apt-get update
sudo apt-get upgrade
sudo apt-get install python-pip python-dev nginx
sudo pip install virtualenv
virtualenv Flask
source Flask/bin/activate
pip install uwsgi flask

```

### Flask application
The application itself would be confined within the file **Lumos.py** where the name Lumos is arbitrary

### uwsgi access point
The **wsgi.py** contains a very simple script, which will serve as an access point to load the flask application.
We can tell **uwsgi** to start the flask app by command
```
uwsgi --socket 0.0.0.0:8000 --protocol=http -w wsgi

```
This will start the **uwsgi** server on port 8000, to test whether the application runs or not. We would not be using this however, instead we will be creating and **ini** script for **uwsgi** to boot from.
### uwsgi.ini script
>[uwsgi] 

>module = wsgi

>master = true
>processes = 5

>socket = /var/sockets/uwsgi/Lumos.sock
>uid = pi
>gid = www-data
>chmod-socket = 664
>vacuum = true

>die-on-term = true

The [uwsgi] tells the **uwsgi** process that it's configuration lies onwards after this line, module will point to our access point **wsgi.py** omitting the extension. We need to provide the process with master permissions so it can spawn and stop processes, the _socket_ corresponds to the unix socket to be created which is shared between this server and the **nginx** server. **nginx** belongs to the group **www-data** thus we set the socket file to have the same group, and give the ownership to our own account, since we'll be running the **uwsgi** process. We provide the socket with rw permissions for user and group. _Vacuum_ allows socket to be closed on SIGTERM and _die-on-term_ makes **uwsgi** kill the child processes contrary to the default action of suspending them.

### systemd configuration
We need to start the **uwsgi** process with above ini script automatically when server boots, so we create a startup script for it.

>[Unit]
>Description=uWSGI instance to serve Lumos

>[Service]
>ExecStartPre=-/bin/bash -c 'mkdir -p /var/sockets/uwsgi; chown pi /var/sockets/uwsgi'
>ExecStart=/bin/bash -c 'cd /home/pi/Lumos; source Flask/bin/activate; uwsgi --ini Lumos.ini'

>[Install]
>WantedBy=multi-user.target

This script is placed in /etc/systemd/system/**uwsgi.service**
The _ExecStartPre_ statement is executed first, and the "=-" indicates that it's okay if this fails. In this statement, we create the directory for socket file if it doesn't exists, and give the ownership to our user account, the same account that'll be using **uwsgi** 
The _ExecStart_ statement is definitely executed, and here we first navigate to our project directory, enable the virtual environment and finally launch the **uwsgi** process.

We can start the service via
```
sudo systemctl start uwsgi
```
We can check the status by
```
systemctl status uwsgi
```
Finally, if everything seems to run, we can enable the service to start on boot by
```
sudo systemctl enable uwsgi
```
### nginx configuration
Finally, we just need to configure **nginx** to act as a reverse proxy for **uwsgi**, we do this by following:
>server {
>   listen 80;
>    server_name _;

>    location / {
>        include uwsgi_params;
>        uwsgi_pass unix:/var/sockets/uwsgi/Lumos.sock;
>    }
>    location ^~ /static/  {
>    include  /etc/nginx/mime.types;
>    root /home/pi/Lumos/;
>    }
>}

The above script is added to /etc/nginx/sites-available/**Lumos** (Lumos is arbitrary again)
The server block tells **nginx** to listen on port 80. The server name is left blank so as to process any requests.
_location_ block simply points to the socket file we setup before via **uwsgi.ini**, present in the directory created by **uwsgi.service**, and this tells **nginx** to act as proxy for this socket.
There are two location blocks. The first routes all requests to '/' to the **uwsgi** server, the second block allows us to serve static files via **nginx** since much better at it.
We link the sites-available to sites-enabled via
```
sudo ln /etc/nginx/sites-available/Lumos /etc/nginx/sites-enabled/
```
We check for any syntax errors via
```
sudo nginx -t
```
To start the service
```
sudo systemctl start nginx
```
To enable the service once everything works
```
sudo systemctl enable nginx

```
