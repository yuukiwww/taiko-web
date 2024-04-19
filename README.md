# 太鼓ウェブ

この太鼓ウェブは改良版です

## デバッグの開始

依存関係をインストールします

```bash
pip install -r requirements.txt
```

データベースを起動します

```bash
docker run --detach \
  --name taiko-mongo-debug \
  --volume taiko-mongo-debug:/data/db \
  --publish 27017:27017 \
  mongo
```

```bash
docker run --detach \
  --name taiko-redis-debug \
  --volume taiko-redis-debug:/data \
  --publish 6379:6379 \
  redis
```

サーバーを起動してください

```bash
flask run
```

## デプロイ

Dockerイメージをビルドします

```bash
docker build -t taiko .
```

データベースを起動します

```bash
docker run --detach \
  --name taiko-mongo \
  --volume taiko-mongo:/data/db \
  mongo
```

```bash
docker run --detach \
  --name taiko-redis \
  --volume taiko-redis:/data \
  redis
```

今すぐデプロイ！

- https://taikoapp.uk/
- https://yuuk1.tk/
- https://yuuk1.uk/
- https://forgejo.win/

```bash
docker run --detach \
  --name taiko \
  --link taiko-mongo \
  --link taiko-redis \
  --env TAIKO_WEB_MONGO_HOST=taiko-mongo \
  --env TAIKO_WEB_REDIS_HOST=taiko-redis \
  --volume songs:/app/public/songs \
  --env LETSENCRYPT_HOST=forgejo.win,yuuk1.tk,yuuk1.uk,taikoapp.uk \
  --env VIRTUAL_HOST=forgejo.win,yuuk1.tk,yuuk1.uk,taikoapp.uk \
  --env VIRTUAL_PORT=8000 \
  taiko
```

終了するには

```bash
docker stop taiko-mongo taiko-redis taiko
docker rm -f taiko-mongo taiko-redis taiko
```
