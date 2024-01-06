FROM python:latest
COPY . /app
WORKDIR /app
RUN pip install -r requirements.txt
CMD ["timeout","0","bash","-eux","start.sh"]
