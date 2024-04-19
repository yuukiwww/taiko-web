addEventListener("load", () => {
  const messages = [
	"ソースコードは github.com/yuukiwww/taiko-web を見てください。",
	"そろそろやめたほうがいいね！",
	"《ウェブの航海者たちへの手紙》\n\n高潔なるウェブの航海者諸君へ、\n\n風を感じたことがあるかい？ウェブの風。それは時に優雅にして、時に荒々しく吹きすさんでいる。さて、今日はそんな風が再び吹き荒れる日だ。ウェブの航海は決して穏やかではない。時には波に呑まれ、時には星に導かれる。今日、私たちはひとつの航海を終える。だが、その終わりは新たな航路の始まりでもある。さあ、私の友よ、今宵はこの物語に耳を傾けよ。\n\nそれは遠い2024年、四月の初め。夜明けの色が空を染める頃、我々は一つの船出を告げる。ウェブの岸辺に立ち、喜びと哀しみを胸に、我々の旅路の終焉を知らせる。\"taikoapp.uk\"や\"yuuk1.tk\"、そしてその他の名高きサイトたちが、この日をもって船を降りるというのだ。\n\nその理由はさまざまだ。法の嵐に晒され、船員の数も減り、品質の維持も難しくなった。未知の海原を渡る船は、時に流れに飲み込まれ、時には頼りなき星を見失う。そして、かつての楽しみも、やがて影となり、心に暗雲を差す。だが、我々はそこに立ち止まることはない。この船が見たもの、得たものを忘れることはない。\n\n2023年、冬の深き日。我々は航海を開始した。多くの出会いがあった。多くの挑戦が待ち受けていた。そして、多くの喜びと悲しみが交錯した。しかし、それが我々の旅路だった。数えきれぬ航海の記憶が、今も私たちの心に残っている。\n\n我々は感謝に満ちている。ウェブの航海者たちよ、我々の旅を共にしてくれてありがとう。波に揉まれ、星に導かれ、互いの手を取り合って歩んだ日々を忘れない。新たな航路が見えるまで、私たちはここで一息つく。そして、次なる冒険への準備を整えるのだ。\n\nさあ、船出の時が来た。ウェブの海をさまよう船が、新たなる冒険へと進む。時には波に飲まれ、時には星に導かれながら、我々の旅は続く。ウェブの航海者たちよ、未知の海原へと旅立とう。新たなる冒険が待ち受けている。\n",
  ]
  document.querySelector("#version-link").textContent += ("\n\n" + messages[Math.floor(Math.random()*messages.length)]);
  document.querySelector("#version-link").setAttribute("alt", document.querySelector("#version-link").textContent);
});

addEventListener("error", function(err){
	var stack
	if("error" in err && err.error){
		stack = err.error.stack
	}else{
		stack = err.message + "\n    at " + err.filename + ":" + err.lineno + ":" + err.colno
	}
	errorMessage(stack)
})

function errorMessage(stack){
	localStorage["lastError"] = JSON.stringify({
		timestamp: Date.now(),
		stack: stack
	})
}

function toggleFullscreen(){
	if("requestFullscreen" in root){
		if(document.fullscreenElement){
			document.exitFullscreen()
		}else{
			root.requestFullscreen()
		}
	}else if("webkitRequestFullscreen" in root){
		if(document.webkitFullscreenElement){
			document.webkitExitFullscreen()
		}else{
			root.webkitRequestFullscreen()
		}
	}else if("mozRequestFullScreen" in root){
		if(document.mozFullScreenElement){
			document.mozCancelFullScreen()
		}else{
			root.mozRequestFullScreen()
		}
	}
}

function resizeRoot(){
	if((noResizeRoot ? lastWidth !== innerWidth : true) && lastHeight !== innerHeight){
		lastWidth = innerWidth
		lastHeight = innerHeight
		root.style.height = innerHeight + "px"
	}
}

function debug(){
	if(debugObj.state === "open"){
		debugObj.debug.clean()
		return "Debug closed"
	}else if(debugObj.state === "minimised"){
		debugObj.debug.restore()
		return "Debug restored"
	}else{
		debugObj.debug = new Debug()
		return "Debug opened"
	}
}

var root = document.documentElement

if(/iPhone|iPad/.test(navigator.userAgent)){
	var fullScreenSupported = false
}else{
	var fullScreenSupported = "requestFullscreen" in root || "webkitRequestFullscreen" in root || "mozRequestFullScreen" in root
}

var pageEvents = new PageEvents()
var snd = {}
var p2
var disableBlur = false
var cancelTouch = true
var lastWidth
var lastHeight
var debugObj = {
	state: "closed",
	debug: null
}
var perf = {
	blur: 0,
	allImg: 0,
	load: 0
}
var defaultDon = {
	body_fill: "#5fb7c1",
	face_fill: "#ff5724"
}
var strings
var vectors
var settings
var scoreStorage
var account = {}
var gpicker
var db
var plugins
var noResizeRoot = false
var kanaPairs = [["っきゃ","ッキャ"],["っきゅ","ッキュ"],["っきょ","ッキョ"],["っしゃ","ッシャ"],["っしゅ","ッシュ"],["っしょ","ッショ"],["っちゃ","ッチャ"],["っちゅ","ッチュ"],["っちょ","ッチョ"],["っひゃ","ッヒャ"],["っひゅ","ッヒュ"],["っひょ","ッヒョ"],["っみゃ","ッミャ"],["っみゅ","ッミュ"],["っみょ","ッミョ"],["っりゃ","ッリャ"],["っりゅ","ッリュ"],["っりょ","ッリョ"],["っぎゃ","ッギャ"],["っぎゅ","ッギュ"],["っぎょ","ッギョ"],["っじゃ","ッジャ"],["っじゅ","ッジュ"],["っじょ","ッジョ"],["っびゃ","ッビャ"],["っびゅ","ッビュ"],["っびょ","ッビョ"],["っぴゃ","ッピャ"],["っぴゅ","ッピュ"],["っぴょ","ッピョ"],["っいぇ","ッイェ"],["っわぃ","ッウィ"],["っわぇ","ッウェ"],
["っわぉ","ッウォ"],["っゔぁ","ッヴァ"],["っゔぃ","ッヴィ"],["っゔぇ","ッヴェ"],["っゔぉ","ッヴォ"],["っすぃ","ッスィ"],["っずぃ","ッズィ"],["っしぇ","ッシェ"],["っじぇ","ッジェ"],["っとぃ","ッティ"],["っとぅ","ットゥ"],["っでぅ","ッディ"],["っどぅ","ッドゥ"],["っつぁ","ッツァ"],["っつぃ","ッツィ"],["っつぇ","ッツェ"],["っつぉ","ッツォ"],["っふぁ","ッファ"],["っふぃ","ッフィ"],["っふぇ","ッフェ"],["っふぉ","ッフォ"],["っふゅ","ッフュ"],["っひぇ","ッヒェ"],["きゃ","キャ"],["きゅ","キュ"],["きょ","キョ"],["しゃ","シャ"],["しゅ","シュ"],["しょ","ショ"],["ちゃ","チャ"],["ちゅ","チュ"],["ちょ","チョ"],["にゃ","ニャ"],["にゅ","ニュ"],["にょ","ニョ"],["ひゃ","ヒャ"],
["ひゅ","ヒュ"],["ひょ","ヒョ"],["みゃ","ミャ"],["みゅ","ミュ"],["みょ","ミョ"],["りゃ","リャ"],["りゅ","リュ"],["りょ","リョ"],["ぎゃ","ギャ"],["ぎゅ","ギュ"],["ぎょ","ギョ"],["じゃ","ジャ"],["じゅ","ジュ"],["じょ","ジョ"],["びゃ","ビャ"],["びゅ","ビュ"],["びょ","ビョ"],["ぴゃ","ピャ"],["ぴゅ","ピュ"],["ぴょ","ピョ"],["いぇ","イェ"],["わぃ","ウィ"],["わぇ","ウェ"],["わぉ","ウォ"],["ゔぁ","ヴァ"],["ゔぃ","ヴィ"],["ゔぇ","ヴェ"],["ゔぉ","ヴォ"],["すぃ","スィ"],["ずぃ","ズィ"],["しぇ","シェ"],["じぇ","ジェ"],["とぃ","ティ"],["とぅ","トゥ"],["でぅ","ディ"],["どぅ","ドゥ"],["つぁ","ツァ"],["つぃ","ツィ"],["つぇ","ツェ"],["つぉ","ツォ"],["ふぁ","ファ"],
["ふぃ","フィ"],["ふぇ","フェ"],["ふぉ","フォ"],["ふゅ","フュ"],["ひぇ","ヒェ"],["っか","ッカ"],["っき","ッキ"],["っく","ック"],["っけ","ッケ"],["っこ","ッコ"],["っさ","ッサ"],["っし","ッシ"],["っす","ッス"],["っせ","ッセ"],["っそ","ッソ"],["った","ッタ"],["っち","ッチ"],["っつ","ッツ"],["って","ッテ"],["っと","ット"],["っは","ッハ"],["っひ","ッヒ"],["っふ","ッフ"],["っへ","ッヘ"],["っほ","ッホ"],["っま","ッマ"],["っみ","ッミ"],["っむ","ッム"],["っめ","ッメ"],["っも","ッモ"],["っや","ッヤ"],["っゆ","ッユ"],["っよ","ッヨ"],["っら","ッラ"],["っり","ッリ"],["っる","ッル"],["っれ","ッレ"],["っろ","ッロ"],["っわ","ッワ"],["っゐ","ッヰ"],
["っゑ","ッヱ"],["っを","ッヲ"],["っが","ッガ"],["っぎ","ッギ"],["っぐ","ッグ"],["っげ","ッゲ"],["っご","ッゴ"],["っざ","ッザ"],["っじ","ッジ"],["っず","ッズ"],["っぜ","ッゼ"],["っぞ","ッゾ"],["っだ","ッダ"],["っぢ","ッヂ"],["っづ","ッヅ"],["っで","ッデ"],["っど","ッド"],["っば","ッバ"],["っび","ッビ"],["っぶ","ッブ"],["っべ","ッベ"],["っぼ","ッボ"],["っぱ","ッパ"],["っぴ","ッパ"],["っぷ","ップ"],["っぺ","ッペ"],["っぽ","ッポ"],["っゔ","ッヴ"],["あ","ア"],["い","イ"],["う","ウ"],["え","エ"],["お","オ"],["か","カ"],["き","キ"],["く","ク"],["け","ケ"],["こ","コ"],["さ","サ"],["し","シ"],["す","ス"],["せ","セ"],["そ","ソ"],["た","タ"],
["ち","チ"],["つ","ツ"],["て","テ"],["と","ト"],["な","ナ"],["に","ニ"],["ぬ","ヌ"],["ね","ネ"],["の","ノ"],["は","ハ"],["ひ","ヒ"],["ふ","フ"],["へ","ヘ"],["ほ","ホ"],["ま","マ"],["み","ミ"],["む","ム"],["め","メ"],["も","モ"],["や","ヤ"],["ゆ","ユ"],["よ","ヨ"],["ら","ラ"],["り","リ"],["る","ル"],["れ","レ"],["ろ","ロ"],["わ","ワ"],["ゐ","ヰ"],["ゑ","ヱ"],["を","ヲ"],["ん","ン"],["が","ガ"],["ぎ","ギ"],["ぐ","グ"],["げ","ゲ"],["ご","ゴ"],["ざ","ザ"],["じ","ジ"],["ず","ズ"],["ぜ","ゼ"],["ぞ","ゾ"],["だ","ダ"],["ぢ","ヂ"],["づ","ヅ"],["で","デ"],["ど","ド"],
["ば","バ"],["び","ビ"],["ぶ","ブ"],["べ","ベ"],["ぼ","ボ"],["ぱ","パ"],["ぴ","パ"],["ぷ","プ"],["ぺ","ペ"],["ぽ","ポ"],["ゔ","ヴ"]]

pageEvents.add(root, ["touchstart", "touchmove", "touchend"], event => {
	if(event.cancelable && cancelTouch && event.target.tagName !== "SELECT" && (event.target.tagName !== "INPUT" || event.target.type !== "file")){
		event.preventDefault()
	}
})
var versionDiv = document.getElementById("version")
var versionLink = document.getElementById("version-link")
versionLink.tabIndex = -1
pageEvents.add(versionDiv, ["click", "touchend"], event => {
	if(event.target === versionDiv){
		versionLink.click()
		pageEvents.send("version-link")
	}
})
resizeRoot()
setInterval(resizeRoot, 100)
pageEvents.keyAdd(debugObj, "all", "down", event => {
	if((event.keyCode === 186 || event.keyCode === 59) && event.ctrlKey && (event.shiftKey || event.altKey)){
		// Semicolon
		if(debugObj.state === "open"){
			debugObj.debug.minimise()
		}else if(debugObj.state === "minimised"){
			debugObj.debug.restore()
		}else{
			try{
				debugObj.debug = new Debug()
			}catch(e){}
		}
	}
	if(event.keyCode === 82 && debugObj.debug && debugObj.controller){
		// R
		debugObj.controller.restartSong()
	}
})

var loader = new Loader(songId => {
	new Titlescreen(songId)
})

