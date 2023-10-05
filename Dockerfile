FROM python:latest
COPY . /app
WORKDIR /app
RUN find wheels -name '*.whl' -print0 | xargs -0 pip install
RUN sed -i 's/\r$//' wait-for-it.sh
RUN chmod +x wait-for-it.sh
CMD ["./wait-for-it.sh","-t","300","mongo:27017","--","python","app.py","34801","-b","0.0.0.0"]
