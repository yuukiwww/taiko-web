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
  --name taiko-web-mongo-debug \
  --volume taiko-web-mongo-debug:/data/db \
  --publish 27017:27017 \
  mongo
```

```bash
docker run --detach \
  --name taiko-web-redis-debug \
  --volume taiko-web-redis-debug:/data \
  --publish 6379:6379 \
  redis
```

サーバーを起動してください

```bash
flask run
```

## デプロイ

今すぐデプロイ！

- https://taikoapp.uk/
