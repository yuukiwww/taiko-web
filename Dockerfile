FROM python:3
COPY . /app
WORKDIR /app
RUN pip install -r requirements.txt
RUN pip install waitress
CMD ["waitress-serve", "app:app"]
