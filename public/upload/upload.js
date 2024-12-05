function uploadFiles() {
  const form = document.querySelector("#upload-form");
  const formData = new FormData(form);

  fetch("/api/upload", {
    method: "POST",
    body: formData,
  })
    .then((res) => {
      if (res.ok) {
        return res.json();
      } else {
        throw new Error(res.url + " で " + res.status.toString() + " が発生しました。");
      }
    })
    .then((data) => {
      if (data.success) {
        alert("おめでとう！ファイルの投稿に成功しました！");
      } else {
        throw new Error(data.error);
      }
    })
    .catch((error) => {
      console.error("エラー:", error);
      document.querySelector("#error-view").textContent = error;
    });
}
