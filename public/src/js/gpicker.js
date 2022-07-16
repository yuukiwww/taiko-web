class Gpicker{
	constructor(...args){
		this.init(...args)
	}
	init(){
		this.apiKey = gameConfig.google_credentials.api_key
		this.oauthClientId = gameConfig.google_credentials.oauth_client_id
		this.projectNumber = gameConfig.google_credentials.project_number
		this.scope = "https://www.googleapis.com/auth/drive.readonly"
		this.folder = "application/vnd.google-apps.folder"
		this.filesUrl = "https://www.googleapis.com/drive/v3/files/"
		this.resolveQueue = []
		this.queueActive = false
		this.clientCallbackBind = this.clientCallback.bind(this)
	}
	browse(lockedCallback, errorCallback){
		return this.loadApi(lockedCallback, errorCallback)
		.then(() => this.getToken(lockedCallback, errorCallback))
		.then(() => new Promise((resolve, reject) => {
			this.displayPicker(data => {
				if(data.action === "picked"){
					var file = data.docs[0]
					var folders = []
					var rateLimit = -1
					var lastBatch = 0
					var walk = (files, output=[]) => {
						for(var i = 0; i < files.length; i++){
							var path = files[i].path ? files[i].path + "/" : ""
							var list = files[i].list
							if(!list){
								continue
							}
							for(var j = 0; j < list.length; j++){
								var file = list[j]
								if(file.mimeType === this.folder){
									folders.push({
										path: path + file.name,
										id: file.id
									})
								}else{
									output.push(new GdriveFile({
										path: path + file.name,
										name: file.name,
										id: file.id
									}))
								}
							}
						}
						var batchList = []
						for(var i = 0; i < folders.length && batchList.length < 100; i++){
							if(!folders[i].listed){
								folders[i].pos = i
								folders[i].listed = true
								batchList.push(folders[i])
							}
						}
						if(batchList.length){
							var batch = gapi.client.newBatch()
							batchList.forEach(folder => {
								var req = {
									q: "'" + folder.id + "' in parents and trashed = false",
									orderBy: "name_natural"
								}
								if(folder.pageToken){
									req.pageToken = folder.pageToken
								}
								batch.add(gapi.client.drive.files.list(req), {id: folder.pos})
							})
							if(lastBatch + batchList.length > 100){
								var waitPromise = this.sleep(1000)
							}else{
								var waitPromise = Promise.resolve()
							}
							return waitPromise.then(() => this.queue()).then(() => batch.then(responses => {
								var files = []
								var rateLimited = false
								for(var i in responses.result){
									var result = responses.result[i].result
									if(result.error){
										if(result.error.errors[0].domain !== "usageLimits"){
											console.warn(result)
										}else if(!rateLimited){
											rateLimited = true
											rateLimit++
											folders.push({
												path: folders[i].path,
												id: folders[i].id,
												pageToken: folders[i].pageToken
											})
										}
									}else{
										if(result.nextPageToken){
											folders.push({
												path: folders[i].path,
												id: folders[i].id,
												pageToken: result.nextPageToken
											})
										}
										files.push({path: folders[i].path, list: result.files})
									}
								}
								if(rateLimited){
									return this.sleep(Math.pow(2, rateLimit) * 1000).then(() => walk(files, output))
								}else{
									return walk(files, output)
								}
							}))
						}else{
							return output
						}
					}
					if(file.mimeType === this.folder){
						return walk([{list: [file]}]).then(resolve, reject)
					}else{
						return reject("cancel")
					}
				}else if(data.action === "cancel"){
					return reject("cancel")
				}
			})
		}))
	}
	loadApi(lockedCallback=()=>{}, errorCallback=()=>{}){
		if(window.gapi && gapi.client && gapi.client.drive){
			return Promise.resolve()
		}
		var promises = [
			loader.loadScript("https://apis.google.com/js/api.js"),
			loader.loadScript("https://accounts.google.com/gsi/client")
		]
		var apiLoaded = false
		return Promise.all(promises).then(() => new Promise((resolve, reject) =>
			gapi.load("picker:client", {
				callback: resolve,
				onerror: reject
			})
		))
		.then(() => new Promise((resolve, reject) => {
			setTimeout(() => {
				if(!apiLoaded){
					lockedCallback(false)
				}
			}, 3000)
			return gapi.client.load("drive", "v3").then(resolve, reject)
		})).then(() => {
			apiLoaded = true
			lockedCallback(true)
		}).catch(e => {
			errorCallback(Array.isArray(e) ? e[0] : e)
			return Promise.reject("cancel")
		})
	}
	getClient(errorCallback=()=>{}, force){
		var obj = {
			client_id: this.oauthClientId,
			scope: this.scope,
			callback: this.clientCallbackBind
		}
		if(force){
			if(!this.clientForce){
				obj.select_account = true
				this.clientForce = google.accounts.oauth2.initTokenClient(obj)
			}
			return this.clientForce
		}else{
			if(!this.client){
				this.client = google.accounts.oauth2.initTokenClient(obj)
			}
			return this.client
		}
	}
	clientCallback(tokenResponse){
		this.tokenResponse = tokenResponse
		this.oauthToken = tokenResponse && tokenResponse.access_token
		if(this.oauthToken && this.tokenResolve){
			this.tokenResolve()
		}
	}
	getToken(lockedCallback=()=>{}, errorCallback=()=>{}, force){
		if(this.oauthToken && !force){
			return Promise.resolve()
		}
		var client = this.getClient(errorCallback, force)
		var promise = new Promise(resolve => {
			this.tokenResolve = resolve
		})
		lockedCallback(false)
		client.requestAccessToken()
		return promise.then(() => {
			this.tokenResolve = null
			if(this.checkScope()){
				lockedCallback(true)
			}else{
				return Promise.reject("cancel")
			}
		})
	}
	checkScope(){
		return google.accounts.oauth2.hasGrantedAnyScope(this.tokenResponse, this.scope)
	}
	switchAccounts(lockedCallback, errorCallback){
		return this.loadApi().then(() => this.getToken(lockedCallback, errorCallback, true))
	}
	displayPicker(callback){
		var picker = gapi.picker.api
		new picker.PickerBuilder()
			.setDeveloperKey(this.apiKey)
			.setAppId(this.projectNumber)
			.setOAuthToken(this.oauthToken)
			.setLocale(strings.gpicker.locale)
			.hideTitleBar()
			.addView(new picker.DocsView("folders")
				.setLabel(strings.gpicker.myDrive)
				.setParent("root")
				.setSelectFolderEnabled(true)
				.setMode("grid")
			)
			.addView(new picker.DocsView("folders")
				.setLabel(strings.gpicker.starred)
				.setStarred(true)
				.setSelectFolderEnabled(true)
				.setMode("grid")
			)
			.addView(new picker.DocsView("folders")
				.setLabel(strings.gpicker.sharedWithMe)
				.setOwnedByMe(false)
				.setSelectFolderEnabled(true)
				.setMode("list")
			)
			.setCallback(callback)
			.setSize(Infinity, Infinity)
			.build()
			.setVisible(true)
	}
	downloadFile(id, responseType, retry){
		var url = this.filesUrl + id + "?alt=media"
		return this.queue().then(this.getToken.bind(this)).then(() =>
			loader.ajax(url, request => {
				if(responseType){
					request.responseType = responseType
				}
				request.setRequestHeader("Authorization", "Bearer " + this.oauthToken)
			}, true).then(event => {
				var request = event.target
				var reject = () => Promise.reject(`${url} (${request.status})`)
				if(request.status === 200){
					return request.response
				}else if(request.status === 401 && !retry){
					return new Response(request.response).json().then(response => {
						var e = response.error
						if(e && e.errors[0].reason === "authError"){
							delete this.oauthToken
							return this.downloadFile(id, responseType, true)
						}else{
							return reject()
						}
					}, reject)
				}
				return reject()
			})
		)
	}
	sleep(time){
		return new Promise(resolve => setTimeout(resolve, time))
	}
	queue(){
		return new Promise(resolve => {
			this.resolveQueue.push(resolve)
			if(!this.queueActive){
				this.queueActive = true
				this.queueTimer = setInterval(this.parseQueue.bind(this), 100)
				this.parseQueue()
			}
		})
	}
	parseQueue(){
		if(this.resolveQueue.length){
			var resolve = this.resolveQueue.shift()
			resolve()
		}else{
			this.queueActive = false
			clearInterval(this.queueTimer)
		}
	}
}
