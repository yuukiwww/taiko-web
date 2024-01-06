FROM python:latest
COPY . /app
WORKDIR /app
RUN pip install -r requirements.txt
ENV PYTHONUNBUFFERED 1
CMD ["timeout","0","python","server.py","34802","-b","0.0.0.0"]
