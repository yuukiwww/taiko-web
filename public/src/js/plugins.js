class Plugins{
	constructor(...args){
		this.init(...args)
	}
	init(){
		this.allPlugins = []
		this.pluginMap = {}
		this.hashes = []
		this.startOrder = []
	}
	add(script, options){
		options = options || {}
		var hash = md5.base64(script.toString())
		var isUrl = typeof script === "string" && !options.raw
		if(isUrl){
			hash = "url " + hash
		}else if(typeof script !== "string"){
			hash = "class " + hash
		}
		var name = options.name
		if(!name && isUrl){
			name = script
			var index = name.lastIndexOf("?")
			if(index !== -1){
				name = name.slice(0, index)
			}
			var index = name.lastIndexOf("/")
			if(index !== -1){
				name = name.slice(index + 1)
			}
			if(name.endsWith(".taikoweb.js")){
				name = name.slice(0, -".taikoweb.js".length)
			}else if(name.endsWith(".js")){
				name = name.slice(0, -".js".length)
			}
		}
		name = name || "plugin"
		if(this.hashes.indexOf(hash) !== -1){
			console.warn("Skip adding an already addded plugin: " + name)
			return
		}
		var baseName = name
		for(var i = 2; name in this.pluginMap; i++){
			name = baseName + i.toString()
		}
		var plugin = new PluginLoader(script, name, hash, options.raw)
		plugin.hide = !!options.hide
		this.allPlugins.push({
			name: name,
			plugin: plugin
		})
		this.pluginMap[name] = plugin
		this.hashes.push(hash)
		return plugin
	}
	remove(name){
		if(name in this.pluginMap){
			var hash = this.pluginMap[name].hash
			if(hash){
				var index = this.hashes.indexOf(hash)
				if(index !== -1){
					this.hashes.splice(index, 1)
				}
			}
			this.unload(name)
		}
		var index = this.allPlugins.findIndex(obj => obj.name === name)
		if(index !== -1){
			this.allPlugins.splice(index, 1)
		}
		var index = this.startOrder.indexOf(name)
		if(index !== -1){
			this.startOrder.splice(index, 1)
		}
		delete this.pluginMap[name]
	}
	load(name){
		return this.pluginMap[name].load()
	}
	loadAll(){
		for(var i = 0; i < this.allPlugins.length; i++){
			this.allPlugins[i].plugin.load()
		}
	}
	start(name){
		return this.pluginMap[name].start()
	}
	startAll(){
		for(var i = 0; i < this.allPlugins.length; i++){
			this.allPlugins[i].plugin.start()
		}
	}
	stop(name){
		return this.pluginMap[name].stop()
	}
	stopAll(){
		for(var i = this.startOrder.length; i--;){
			this.pluginMap[this.startOrder[i]].stop()
		}
	}
	unload(name){
		return this.pluginMap[name].unload()
	}
	unloadAll(){
		for(var i = this.startOrder.length; i--;){
			this.pluginMap[this.startOrder[i]].unload()
		}
		for(var i = this.allPlugins.length; i--;){
			this.allPlugins[i].plugin.unload()
		}
	}
	unloadImported(){
		for(var i = this.startOrder.length; i--;){
			var plugin = this.pluginMap[this.startOrder[i]]
			if(plugin.imported){
				plugin.unload()
			}
		}
		for(var i = this.allPlugins.length; i--;){
			var obj = this.allPlugins[i]
			if(obj.plugin.imported){
				obj.plugin.unload()
			}
		}
	}
	
	strFromFunc(func){
		var output = func.toString()
		return output.slice(output.indexOf("{") + 1, output.lastIndexOf("}"))
	}
	argsFromFunc(func){
		var output = func.toString()
		output = output.slice(0, output.indexOf("{"))
		output = output.slice(output.indexOf("(") + 1, output.lastIndexOf(")"))
		return output.split(",").map(str => str.trim()).filter(Boolean)
	}
	insertBefore(input, insertedText, searchString){
		var index = input.indexOf(searchString)
		if(index === -1){
			throw new Error("searchString not found: " + searchString)
		}
		return input.slice(0, index) + insertedText + input.slice(index)
	}
	insertAfter(input, searchString, insertedText){
		var index = input.indexOf(searchString)
		if(index === -1){
			throw new Error("searchString not found: " + searchString)
		}
		var length = searchString.length
		return input.slice(0, index + length) + insertedText + input.slice(index + length)
	}
	strReplace(input, searchString, insertedText, repeat=1){
		var position = 0
		for(var i = 0; i < repeat; i++){
			var index = input.indexOf(searchString, position)
			if(index === -1){
				if(repeat === Infinity){
					break
				}else{
					throw new Error("searchString not found: " + searchString)
				}
			}
			input = input.slice(0, index) + insertedText + input.slice(index + searchString.length)
			position = index + insertedText.length
		}
		return input
	}
	isObject(input){
		return input && typeof input === "object" && input.constructor === Object
	}
	deepMerge(target, ...sources){
		sources.forEach(source => {
			if(this.isObject(target) && this.isObject(source)){
				for(var i in source){
					if(this.isObject(source[i])){
						if(!target[i]){
							target[i] = {}
						}
						this.deepMerge(target[i], source[i])
					}else if(source[i]){
						target[i] = source[i]
					}
				}
			}
		})
		return target
	}
	arrayDel(array, item){
		var index = array.indexOf(item)
		if(index !== -1){
			array.splice(index, 1)
			return true
		}
		return false
	}
	
	hasSettings(){
		for(var i = 0; i < this.allPlugins.length; i++){
			var plugin = this.allPlugins[i].plugin
			if(plugin.loaded && (!plugin.hide || plugin.settings())){
				return true
			}
		}
		return false
	}
	getSettings(){
		var items = []
		for(var i = 0; i < this.allPlugins.length; i++){
			var obj = this.allPlugins[i]
			let plugin = obj.plugin
			if(!plugin.loaded){
				continue
			}
			if(!plugin.hide){
				let description
				let description_lang
				var module = plugin.module
				if(module){
					description = [
						module.description,
						module.author ? strings.plugins.author.replace("%s", module.author) : null,
						module.version ? strings.plugins.version.replace("%s", module.version) : null
					].filter(Boolean).join("\n")
					description_lang = {}
					languageList.forEach(lang => {
						description_lang[lang] = [
							this.getLocalTitle(module.description, module.description_lang, lang),
							module.author ? allStrings[lang].plugins.author.replace("%s", module.author) : null,
							module.version ? allStrings[lang].plugins.version.replace("%s", module.version) : null
						].filter(Boolean).join("\n")
					})
				}
				var name = module && module.name || obj.name
				var name_lang = module && module.name_lang
				items.push({
					name: name,
					name_lang: name_lang,
					description: description,
					description_lang: description_lang,
					type: "toggle",
					default: true,
					getItem: () => plugin.started,
					setItem: value => {
						if(plugin.name in this.pluginMap){
							if(plugin.started && !value){
								this.stop(plugin.name)
							}else if(!plugin.started && value){
								this.start(plugin.name)
							}
						}
					}
				})
			}
			var settings = plugin.settings()
			if(settings){
				settings.forEach(setting => {
					if(!setting.name){
						setting.name = name
						if(!setting.name_lang){
							setting.name_lang = name_lang
						}
					}
					if(typeof setting.getItem !== "function"){
						setting.getItem = () => {}
					}
					if(typeof setting.setItem !== "function"){
						setting.setItem = () => {}
					}
					if(!("indent" in setting) && !plugin.hide){
						setting.indent = 1
					}
					items.push(setting)
				})
			}
		}
		return items
	}
	getLocalTitle(title, titleLang, lang){
		if(titleLang){
			for(var id in titleLang){
				if(id === (lang || strings.id) && titleLang[id]){
					return titleLang[id]
				}
			}
		}
		return title
	}
}

class PluginLoader{
	constructor(...args){
		this.init(...args)
	}
	init(script, name, hash, raw){
		this.name = name
		this.hash = hash
		if(typeof script === "string"){
			if(raw){
				this.url = URL.createObjectURL(new Blob([script], {
					type: "application/javascript"
				}))
			}else{
				this.url = script
			}
		}else{
			this.class = script
		}
	}
	load(loadErrors){
		if(this.loaded){
			return Promise.resolve()
		}else if(!this.url && !this.class){
			if(loadErrors){
				return Promise.reject()
			}else{
				return Promise.resolve()
			}
		}else{
			return (this.url ? import(this.url) : Promise.resolve({
				default: this.class
			})).then(module => {
				if(this.url){
					URL.revokeObjectURL(this.url)
					delete this.url
				}else{
					delete this.class
				}
				this.loaded = true
				try{
					this.module = new module.default()
				}catch(e){
					this.error()
					var error = new Error()
					error.stack = "Error initializing plugin: " + this.name + "\n" + e.stack
					if(loadErrors){
						return Promise.reject(error)
					}else{
						console.error(error)
						return Promise.resolve()
					}
				}
				var output
				try{
					if(this.module.beforeLoad){
						this.module.beforeLoad(this)
					}
					if(this.module.load){
						output = this.module.load(this)
					}
				}catch(e){
					this.error()
					var error = new Error()
					error.stack = "Error in plugin load: " + this.name + "\n" + e.stack
					if(loadErrors){
						return Promise.reject(error)
					}else{
						console.error(error)
						return Promise.resolve()
					}
				}
				if(typeof output === "object" && output.constructor === Promise){
					return output.catch(e => {
						this.error()
						var error = new Error()
						error.stack = "Error in plugin load promise: " + this.name + (e ? "\n" + e.stack : "")
						if(loadErrors){
							return Promise.reject(error)
						}else{
							console.error(error)
							return Promise.resolve()
						}
					})
				}
			}, e => {
				this.error()
				plugins.remove(this.name)
				if(e.name === "SyntaxError"){
					var error = new SyntaxError()
					error.stack = "Error in plugin syntax: " + this.name + "\n" + e.stack
				}else{
					var error = e
				}
				if(loadErrors){
					return Promise.reject(error)
				}else{
					console.error(error)
					return Promise.resolve()
				}
			})
		}
	}
	start(orderChange, startErrors){
		if(!orderChange){
			plugins.startOrder.push(this.name)
		}
		return this.load().then(() => {
			if(!this.started && this.module){
				this.started = true
				try{
					if(this.module.beforeStart){
						this.module.beforeStart()
					}
					if(this.module.start){
						this.module.start()
					}
				}catch(e){
					this.error()
					var error = new Error()
					error.stack = "Error in plugin start: " + this.name + "\n" + e.stack
					if(startErrors){
						return Promise.reject(error)
					}else{
						console.error(error)
						return Promise.resolve()
					}
				}
			}
		})
	}
	stop(orderChange, noError){
		if(this.loaded && this.started){
			if(!orderChange){
				var stopIndex = plugins.startOrder.indexOf(this.name)
				if(stopIndex !== -1){
					plugins.startOrder.splice(stopIndex, 1)
					for(var i = plugins.startOrder.length; i-- > stopIndex;){
						plugins.pluginMap[plugins.startOrder[i]].stop(true)
					}
				}
			}
			
			this.started = false
			try{
				if(this.module.beforeStop){
					this.module.beforeStop()
				}
				if(this.module.stop){
					this.module.stop()
				}
			}catch(e){
				var error = new Error()
				error.stack = "Error in plugin stop: " + this.name + "\n" + e.stack
				console.error(error)
				if(!noError){
					this.error()
				}
			}
			
			if(!orderChange && stopIndex !== -1){
				for(var i = stopIndex; i < plugins.startOrder.length; i++){
					plugins.pluginMap[plugins.startOrder[i]].start(true)
				}
			}
		}
	}
	unload(error){
		if(this.loaded){
			if(this.started){
				this.stop(false, error)
			}
			this.loaded = false
			plugins.remove(this.name)
			if(this.module){
				try{
					if(this.module.beforeUnload){
						this.module.beforeUnload()
					}
					if(this.module.unload){
						this.module.unload()
					}
				}catch(e){
					var error = new Error()
					error.stack = "Error in plugin unload: " + this.name + "\n" + e.stack
					console.error(error)
				}
				delete this.module
			}
		}
	}
	error(){
		if(this.module && this.module.error){
			try{
				this.module.error()
			}catch(e){
				var error = new Error()
				error.stack = "Error in plugin error: " + this.name + "\n" + e.stack
				console.error(error)
			}
		}
		this.unload(true)
	}
	settings(){
		if(this.module && this.module.settings){
			try{
				var settings = this.module.settings()
			}catch(e){
				console.error(e)
				this.error()
				return
			}
			if(Array.isArray(settings)){
				return settings
			}
		}
	}
}

class EditValue{
	constructor(...args){
		this.init(...args)
	}
	init(parent, name){
		if(name){
			if(!parent){
				throw new Error("Parent is not defined")
			}
			this.name = [parent, name]
			this.delete = !(name in parent)
		}else{
			this.original = parent
		}
	}
	load(callback){
		this.loadCallback = callback
		return this
	}
	start(){
		if(this.name){
			this.original = this.name[0][this.name[1]]
		}
		try{
			var output = this.loadCallback(this.original)
		}catch(e){
			console.error(this.loadCallback)
			var error = new Error()
			error.stack = "Error editing the value of " + this.getName() + "\n" + e.stack
			throw error
		}
		if(typeof output === "undefined"){
			console.error(this.loadCallback)
			throw new Error("Error editing the value of " + this.getName() + ": A value is expected to be returned")
		}
		if(this.name){
			this.name[0][this.name[1]] = output
		}
		return output
	}
	stop(){
		if(this.name){
			if(this.delete){
				delete this.name[0][this.name[1]]
			}else{
				this.name[0][this.name[1]] = this.original
			}
		}
		return this.original
	}
	getName(){
		var name = "unknown"
		try{
			if(this.name){
				var name = (
					typeof this.name[0] === "function" && this.name[0].name
					|| (
						typeof this.name[0] === "object" && typeof this.name[0].constructor === "function" && (
							this.name[0] instanceof this.name[0].constructor ? (() => {
								var consName = this.name[0].constructor.name || ""
								return consName.slice(0, 1).toLowerCase() + consName.slice(1)
							})() : this.name[0].constructor.name + ".prototype"
						)
					) || name
				) + (this.name[1] ? "." + this.name[1] : "")
			}
		}catch(e){
			name = "error"
		}
		return name
	}
	unload(){
		delete this.name
		delete this.original
		delete this.loadCallback
	}
}

class EditFunction extends EditValue{
	start(){
		if(this.name){
			this.original = this.name[0][this.name[1]]
		}
		if(typeof this.original !== "function"){
			console.error(this.loadCallback)
			var error = new Error()
			error.stack = "Error editing the function value of " + this.getName() + ": Original value is not a function"
			throw error
		}
		var args = plugins.argsFromFunc(this.original)
		try{
			var output = this.loadCallback(plugins.strFromFunc(this.original), args)
		}catch(e){
			console.error(this.loadCallback)
			var error = new Error()
			error.stack = "Error editing the function value of " + this.getName() + "\n" + e.stack
			throw error
		}
		if(typeof output === "undefined"){
			console.error(this.loadCallback)
			throw new Error("Error editing the function value of " + this.getName() + ": A value is expected to be returned")
		}
		try{
			var output = Function(...args, output)
		}catch(e){
			console.error(this.loadCallback)
			var error = new SyntaxError()
			var blob = new Blob([output], {
				type: "application/javascript"
			})
			var url = URL.createObjectURL(blob)
			error.stack = "Error editing the function value of " + this.getName() + ": Could not evaluate string, check the full string for errors: " + url + "\n" + e.stack
			setTimeout(() => {
				URL.revokeObjectURL(url)
			}, 5 * 60 * 1000)
			throw error
		}
		if(this.name){
			this.name[0][this.name[1]] = output
		}
		return output
	}
}

class Patch{
	constructor(...args){
		this.init(...args)
	}
	init(){
		this.edits = []
		this.addedLanguages = []
	}
	addEdits(...args){
		args.forEach(arg => this.edits.push(arg))
	}
	addLanguage(lang, forceSet, fallback="en"){
		if(fallback){
			lang = plugins.deepMerge({}, allStrings[fallback], lang)
		}
		this.addedLanguages.push({
			lang: lang,
			forceSet: forceSet
		})
	}
	beforeStart(){
		this.edits.forEach(edit => edit.start())
		this.addedLanguages.forEach(obj => {
			settings.addLang(obj.lang, obj.forceSet)
		})
	}
	beforeStop(){
		for(var i = this.edits.length; i--;){
			this.edits[i].stop()
		}
		for(var i = this.addedLanguages.length; i--;){
			settings.removeLang(this.addedLanguages[i].lang)
		}
	}
	beforeUnload(){
		this.edits.forEach(edit => edit.unload())
	}
	log(...args){
		var name = this.name || "Plugin"
		console.log(
			"%c[" + name + "]",
			"font-weight: bold;",
			...args
		)
	}
}
