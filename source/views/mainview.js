//TODO: handle activate/deactivate
enyo.kind({
	name: "FeedSpider2.MainView",
	kind: "FeedSpider2.BaseView",
	fit: true,
	
	components:[
		{kind: "onyx.Toolbar", layoutKind: "FittableColumnsLayout", noStretch: true, components: [
			{kind: "onyx.MenuDecorator", ontap: "openPreferences", components: [
				{kind: "onyx.IconButton", src: "assets/menu-icon.png"},
			    {kind: "onyx.Menu", components: [
        			//{kind: "onyx.MenuItem", content: "Add Subscription"},
        			//{name: "showHideFeedsMenuItem", kind: "onyx.MenuItem", ontap: "toggleFeeds"},
        			//{classes: "onyx-menu-divider"},
        			//{name: "preferencesMenuItem", kind: "onyx.MenuItem", ontap: "openPreferences", content: "Preferences"},
        			//{content: "Help"},
        			//{classes: "onyx-menu-divider"},
        			{content: "Logout"},
    			]}
			]},
			{tag: "span", content: "FeedSpider 2", style:"font-weight: bold; text-align: center", fit: true},
			{name: "errorIcon", kind: "onyx.Icon", src: "assets/error.png", style: "display: none"},
			{name: "smallSpinner", kind: "onyx.Icon", src: "assets/small-spinner.gif", style: "display: none"},
			{name: "refreshButton", kind: "onyx.IconButton", ontap: "switchPanels", src: "assets/refresh.png"}
		]},
		
		{name: "MainList", kind: "enyo.Scroller", fit: true, style: "background-color: #e6e3de; padding-top: 5px"},
		{name: "LoginDialog", kind: "FeedSpider2.LoginDialog", onLoginSuccess: "loginSuccess"}
	],
	
  	create: function() {
    	this.inherited(arguments);
    	this.credentials = new Credentials();
    	this.loaded = false;
    	this.reloading = false;
	},
	
	rendered: function() {
		this.inherited(arguments);
		if (Preferences.hideReadFeeds()){
			//this.$.showHideFeedsMenuItem.setContent("Show Read Feeds")
		}
		else
		{
			//this.$.showHideFeedsMenuItem.setContent("Hide Read Feeds")
		}
		//this.$.LoginDialog.show();
		this.checkCredentials();
	},

	activate: function(changes) {
		this.filterAndRefresh()
		//this.listenForSearch()
	},
	
	loginSuccess: function(inSender, inEvent) {
    	this.$.LoginDialog.hide();
    	//this.api = inEvent; // Put this back when reinstating the login window.
    	this.sources = new AllSources(this.api);
    	this.parent.sources = this.sources
    	this.loaded = false;
    	this.showAddSubscription = true;
    	
    	this.reload()
    	return true;
  	},

	refresh: function() {
		var self = this

		var refreshComplete = function() {
			self.refreshing = false
			//TODO: Event handling
			//Mojo.Event.send(document, Feeder.Event.refreshComplete, {sources: self.sources})
		}

		if(!self.refreshing) {
			self.refreshing = true
			self.sources.findAll(refreshComplete, refreshComplete)
		}
	},

	reload: function() {
		var self = this

		if(!self.reloading) {
			self.reloading = true
			this.$.refreshButton.hide()
			this.$.errorIcon.hide()
			this.$.smallSpinner.show()

			self.sources.findAll(
				function() {
					self.reloading = false
					self.loaded = true
					self.filterAndRefresh()
				}.bind(this),

				function() {
					this.showError()
				}.bind(this)
			)
		}
	},

	filterAndRefresh: function() {
		var self = this
		if(self.loaded) {
			self.sources.sortAndFilter(
				function() {
					//NOTE TO SELF: This will likely cause replication. Find a better way to structure and update the list.
					//TODO: Causes Replication. Figure out better way of handling this behaviour.
					self.refreshList(self.$.MainList, self.sources.stickySources.items)
			    	self.$.MainList.createComponent({kind: "FeedSpider2.Divider", title: "Subscriptions"})
					self.refreshList(self.$.MainList, self.sources.subscriptionSources.items)
					
					self.$.MainList.render()
					self.$.smallSpinner.hide()
					self.$.refreshButton.show()
				},

				this.showError.bind(this)
			)
		}
	},

	showError: function() {
		this.reloading = false
		this.loaded = false
		this.$.refreshButton.hide()
		this.$.errorIcon.show()
		this.$.smallSpinner.hide()
	},
	
	switchPanels: function() {
		this.doSwitchPanels(this)
	},

	toggleFeeds: function() {
		if (Preferences.hideReadFeeds()){
			this.$.showHideFeedsMenuItem.setContent("Hide Read Feeds")
			Preferences.setHideReadFeeds(false);
          	//this.reload();
          	this.filterAndRefresh();
		}
		else
		{
			this.$.showHideFeedsMenuItem.setContent("Show Read Feeds")
			Preferences.setHideReadFeeds(true);
          	//this.reload();
          	this.filterAndRefresh();
		}
	},
	
	sourceTapped: function(inSender, inEvent) {
		if(inEvent.isFolder && !Preferences.combineFolders()) {
			this.doSwitchPanels({target: "folder", api: this.api, folder: inEvent, previousPage: this})
		}
		else {
			this.doSwitchPanels({target: "feed", api: this.api, subscription: inEvent, previousPage: this})
		}
		return true
	},

	//BEGIN CODE TO BE PORTED
	sourcesReordered: function(event) {
		var beforeSubscription = null

		if(event.toIndex < this.sources.subscriptionSources.items.length - 1) {
			var beforeIndex = event.toIndex

			if(event.fromIndex < event.toIndex) {
				beforeIndex += 1
			}

			beforeSubscription = this.sources.subscriptionSources.items[beforeIndex]
		}

		this.sources.subscriptions.move(event.item, beforeSubscription)
	},

	sourceDeleted: function(event) {
		this.sources.subscriptions.remove(event.item)
	},

	divide: function(source) {
		return source.divideBy
	},	

	articleRead: function(event) {
		Log.debug("1 item marked read in " + event.subscriptionId)
		this.sources.articleRead(event.subscriptionId)
		//TODO: Check Active Panel
		if(this.active) this.filterAndRefresh()
	},

	articleNotRead: function(event) {
		Log.debug("1 item marked not read in " + event.subscriptionId)
		this.sources.articleNotRead(event.subscriptionId)
		//TODO: Check Active Panel
		if(this.active) this.filterAndRefresh()
	},

	markedAllRead: function(event) {
		Log.debug(event.count + " items marked read in " + event.id)

		if(event.id == "user/-/state/com.google/reading-list") {
			this.sources.nukedEmAll()
		}
		else {
			this.sources.markedAllRead(event.count)
		}

		this.filterAndRefresh()
	},

	folderDeleted: function() {
		this.reload()
	},

	doSearch: function(query) {
		if(this.api.supportsSearch())
		{
			this.controller.stageController.pushScene("articles", this.api, new Search(this.api, query))
		}
		else
		{
			Feeder.notify($L("Search Not Available"))
		}
	},
	//END CODE TO BE PORTED

  	/* Begin TEMP Troubleshooting code */
  	checkCredentials: function() {
		this.credentials.service = "tor"
		this.credentials.email = "aressel@gmail.com"
		this.credentials.password = "BenchMonk3y"
					
		this.tryLogin();
	},
	
	tryLogin: function() {
		// Attempt login
    	this.api = new Api();
    	this.api.login(this.credentials, this.loginSuccess.bind(this), function(){});
	}
	/* End TEMP Troubleshooting Code */
  	
});