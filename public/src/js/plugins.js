class Plugins{
	constructor(...args){
		this.init(...args)
	}
	init(){
		this.imported = []
		this.allPlugins = []
		this.pluginMap = {}
		this.hashes = []
	}
	add(script, name){
		var hash = md5.base64(script.toString())
		if(this.hashes.indexOf(hash) !== -1){
			console.warn("Skip adding an already addded plugin: " + name)
			return
		}
		name = name || "plugin"
		var baseName = name
		for(var i = 2; name in this.allPlugins; i++){
			name = baseName + i.toString()
		}
		var plugin = new PluginLoader(script, name, hash)
		this.allPlugins.push({
			name: name,
			plugin: plugin
		})
		this.pluginMap[name] = plugin
		this.hashes.push(hash)
		return plugin
	}
	remove(name){
		var hash = this.pluginMap[name].hash
		if(hash){
			var index = this.hashes.indexOf(hash)
			if(index !== -1){
				this.hashes.splice(index, 1)
			}
		}
		this.unload(name)
		var index = this.imported.findIndex(obj => obj.name === name)
		if(index !== -1){
			this.imported.splice(index, 1)
		}
		var index = this.allPlugins.findIndex(obj => obj.name === name)
		if(index !== -1){
			this.allPlugins.splice(index, 1)
		}
		delete this.pluginMap[name]
	}
	load(name){
		this.pluginMap[name].load()
	}
	loadAll(){
		for(var i = 0; i < this.allPlugins.length; i++){
			this.allPlugins[i].plugin.load()
		}
	}
	start(name){
		this.pluginMap[name].start()
	}
	startAll(){
		for(var i = 0; i < this.allPlugins.length; i++){
			this.allPlugins[i].plugin.start()
		}
	}
	stop(name){
		this.pluginMap[name].stop()
	}
	stopAll(){
		for(var i = this.allPlugins.length; i--;){
			this.allPlugins[i].plugin.stop()
		}
	}
	unload(name){
		this.pluginMap[name].unload()
	}
	unloadAll(){
		for(var i = this.allPlugins.length; i--;){
			this.allPlugins[i].plugin.unload()
		}
	}
	unloadImported(){
		for(var i = this.imported.length; i--;){
			this.imported[i].plugin.unload()
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
	strReplace(input, searchString, insertedText){
		var index = input.indexOf(searchString)
		if(index === -1){
			throw new Error("searchString not found: " + searchString)
		}
		return input.slice(0, index) + insertedText + input.slice(index + searchString.length)
	}
	
	getSettings(){
		var items = {}
		for(var i = 0; i < this.allPlugins.length; i++){
			var obj = this.allPlugins[i]
			let plugin = obj.plugin
			items[obj.name] = {
				name: plugin.module.name || obj.name,
				type: "toggle",
				default: true,
				getItem: () => plugin.started,
				setItem: value => {
					if(plugin.started && !value){
						plugin.stop()
					}else if(!plugin.started && value){
						plugin.start()
					}
				}
			}
		}
		return items
	}
}

class PluginLoader{
	constructor(...args){
		this.init(...args)
	}
	init(script, name, hash){
		this.name = name
		this.hash = hash
		if(typeof script === "string"){
			this.url = URL.createObjectURL(new Blob([script], {
				type: "application/javascript"
			}))
		}else{
			this.class = script
		}
	}
	load(){
		if(this.loaded || !this.url && !this.class){
			return Promise.resolve()
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
					console.error(e)
					this.error()
					return
				}
				try{
					if(this.module.beforeLoad){
						this.module.beforeLoad(this)
					}
					if(this.module.load){
						this.module.load(this)
					}
				}catch(e){
					console.error(e)
					this.error()
				}
			})
		}
	}
	start(){
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
					console.error(e)
					this.error()
				}
			}
		})
	}
	stop(error){
		if(this.loaded && this.started){
			this.started = false
			try{
				if(this.module.beforeStop){
					this.module.beforeStop()
				}
				if(this.module.stop){
					this.module.stop()
				}
			}catch(e){
				console.error(e)
				if(!error){
					this.error()
				}
			}
		}
	}
	unload(error){
		if(this.loaded){
			if(this.started){
				this.stop(error)
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
					console.error(e)
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
				console.error(e)
			}
		}
		this.unload(true)
	}
}

class EditValue{
	constructor(...args){
		this.init(...args)
	}
	init(parent, name){
		if(name){
			this.original = parent[name]
			this.name = [parent, name]
			this.delete = !(name in parent)
		}else{
			this.original = parent
		}
	}
	load(callback){
		var output = callback(this.original)
		if(typeof output === "undefined"){
			throw new Error("A value is expected to be returned")
		}
		this.edited = output
		return this
	}
	start(){
		if(this.name){
			this.name[0][this.name[1]] = this.edited
		}
		return this.edited
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
	unload(){
		delete this.name
		delete this.edited
		delete this.original
	}
}

class EditFunction extends EditValue{
	load(callback){
		var output = callback(plugins.strFromFunc(this.original))
		if(typeof output === "undefined"){
			throw new Error("A value is expected to be returned")
		}
		var args = plugins.argsFromFunc(this.original)
		this.edited = Function(...args, output)
		return this
	}
}

class Patch{
	edits = []
	addEdits(...args){
		args.forEach(arg => this.edits.push(arg))
	}
	beforeStart(){
		this.edits.forEach(edit => edit.start())
	}
	beforeStop(){
		this.edits.forEach(edit => edit.stop())
	}
	beforeUnload(){
		this.edits.forEach(edit => edit.unload())
	}
	log(message){
		var name = this.name || "Plugin"
		console.log(
			"%c[" + name + "]%c " + message,
			"font-weight: bold;",
			""
		)
	}
}
