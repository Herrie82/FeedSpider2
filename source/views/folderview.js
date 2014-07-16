enyo.kind({
	name: "FeedSpider2.FolderView",
	kind: "FeedSpider2.BaseView",
	fit: true,
	
	published: {
		api: "",
		folder: "",
		subscriptions: {items: []}
	},
	
	components:[
		{kind: "onyx.Toolbar", layoutKind: "FittableColumnsLayout", noStretch: true, components: [
			{kind: "onyx.MenuDecorator", components: [
				{kind: "onyx.IconButton", src: "assets/menu-icon.png"},
			    {kind: "onyx.Menu", floating: true, components: [
        			{content: "Refresh", onSelect: "triggerRefresh"},
        			{name: "showHideFeedsMenuItem", onSelect: "toggleFeeds"},
        			{classes: "onyx-menu-divider"},
        			{content: "Preferences", onSelect: "openPreferences"},
        			{content: "Help", onSelect: "openHelp"},
        			{classes: "onyx-menu-divider"},
        			{content: "Logout", onSelect: "handleLogout"},
    			]}
			]},
			{kind: "onyx.IconButton", src: "assets/go-back.png", ontap: "handleGoBack"},
			{name: "title", tag: "span", style:"font-weight: bold; text-align: center", fit: true},
			{kind: "onyx.Icon"}, //This is here to keep the header centered.
			{name: "errorIcon", kind: "onyx.Icon", src: "assets/error.png", style: "display: none"},
			{name: "smallSpinner", kind: "onyx.Icon", src: "assets/small-spinner.gif", style: "display: none"},
			{name: "refreshButton", kind: "onyx.IconButton"}
		]},
		
		{name: "MainList", kind: "AroundList", fit: true, count: 0, style:"width: 100%;", reorderable: true, centerReorderContainer: false, enableSwipe: true, persistSwipeableItem: true, onSetupItem: "setupItem", onSetupReorderComponents: "setupReorderComponents", onSetupSwipeItem: "setupSwipeItem", onReorder: "sourcesReordered", aboveComponents: [
			{name: "stickySources", kind: "enyo.FittableRows"},
		], components: [
			{name: "source", style: "width: 100%; border-bottom-width: 1px; border-bottom-style: groove", ontap: "listSourceTapped" , layoutKind: "enyo.FittableColumnsLayout", components: [
				{name: "sourceIcon", style: "height: 50px; width: 30px;"},
				{name: "sourceName", classes: "subscription-title", tag: "span", fit: true},
				{name: "sourceUnreadCount", classes: "subscription-count", tag: "span"}
			]}
		],
		reorderComponents: [
			{name: "reorderContent", classes: "enyo-fit", layoutKind: "enyo.FittableColumnsLayout", style: "background:lightgrey;", components: [
				{name: "reorderIcon", style: "height: 50px; width: 30px;"},
				{name: "reorderName", classes: "subscription-title", style:"color: white;", tag: "span", fit: true},
				{name: "reorderUnreadCount", classes: "subscription-count", tag: "span"}
			]}
		],
		swipeableComponents: [
			{style: "height: 100%; background-color: darkgrey; text-align:center", components: [
				{kind: "onyx.Button", content: "Delete", style: "margin-top: 10px; margin-right: 10px;", classes:"onyx-negative", ontap: "deleteButtonTapped"},
				{kind: "onyx.Button", content: "Cancel", style: "margin-left: 10px;", ontap: "cancelButtonTapped"}
			]}
		]},
	],
	
  	create: function() {
    	this.inherited(arguments);
	},

	activate: function(changes) {
		if (Preferences.isManualFeedSort())
		{
			this.$.MainList.setReorderable(true)
		}
		else
		{
			this.$.MainList.setReorderable(false)
		}
		
		if (Preferences.hideReadFeeds()){
			this.$.showHideFeedsMenuItem.setContent("Show Read Feeds")
		}
		else
		{
			this.$.showHideFeedsMenuItem.setContent("Hide Read Feeds")
		}
		
		this.$.title.setContent(this.folder.title)
		this.filterAndRefresh()
	},

	setupItem: function(inSender, inEvent) {
		var i = inEvent.index;
		var item = this.subscriptions.items[i];
		
		this.$.sourceName.setContent(item.title);
		
		this.$.sourceIcon.addRemoveClass("subscription-folder", item.isFolder);
		this.$.sourceIcon.addRemoveClass("subscription-rss", !item.isFolder);

		if (item.unreadCount > 0)
    	{
    		//The reason for this ugly hack on FirefoxOS is because using float:right will cause the count to be displayed
    		//on the next line of the list. We know that this will work because sticky sources is rendered first, and at 
    		//this point, we can guarantee the presence of at least one source.
    		if (enyo.platform.firefoxOS)
    		{
    			var width = this.$.stickySources.controls[0].controls[0].controls[1].domStyles.width;
    			var remainder = window.innerWidth - parseInt(width) - 70; //This is calculated by taking window width less width of the all items title column, less 30px for the icon and 40px for the margins.
    			this.$.sourceName.setStyle("width:" + width + "; font-weight: bold");
    			this.$.sourceUnreadCount.setStyle("width:" + remainder + "px; text-align: right; font-weight: bold");
    		}
    		else
    		{
    			this.$.sourceName.setStyle("font-weight: bold");
    			this.$.sourceUnreadCount.setStyle("float: right; font-weight: bold");
    		}
    		this.$.sourceUnreadCount.setContent(item.unreadCount); 		
    	} 
		else
		{
    		this.$.sourceName.setStyle("");
    		this.$.sourceUnreadCount.setStyle("");
			this.$.sourceUnreadCount.setContent("");
			this.$.sourceUnreadCount.hide();
		}
		
		return true;
	},

	setupReorderComponents: function(inSender, inEvent) {
		var i = inEvent.index;
		if(!this.subscriptions.items[i]) {
			return;
		}

		var item = this.subscriptions.items[i];
		this.$.reorderName.setContent(item.title);
		
		this.$.reorderIcon.addRemoveClass("subscription-folder", item.isFolder);
		this.$.reorderIcon.addRemoveClass("subscription-rss", !item.isFolder);

		if (item.unreadCount > 0)
    	{
    		//The reason for this ugly hack on FirefoxOS is because using float:right will cause the count to be displayed
    		//on the next line of the list. We know that this will work because sticky sources is rendered first, and at 
    		//this point, we can guarantee the presence of at least one source.
    		if (enyo.platform.firefoxOS)
    		{
    			var width = this.$.stickySources.controls[0].controls[0].controls[1].domStyles.width;
    			var remainder = window.innerWidth - parseInt(width) - 70; //This is calculated by taking window width less width of the all items title column, less 30px for the icon and 40px for the margins.
    			this.$.reorderName.setStyle("width:" + width + "; font-weight: bold");
    			this.$.reorderUnreadCount.setStyle("width:" + remainder + "px; text-align: right; font-weight: bold");
    		}
    		else
    		{
    			this.$.reorderName.setStyle("font-weight: bold");
    			this.$.reorderUnreadCount.setStyle("float: right; font-weight: bold");
    		}
    		this.$.reorderUnreadCount.setContent(item.unreadCount); 		
    	} 
		else
		{
    		this.$.reorderName.setStyle("");
    		this.$.reorderUnreadCount.setStyle("");
			this.$.reorderUnreadCount.setContent("");
			this.$.reorderUnreadCount.hide();
		}
		
		return true;
	},

	setupSwipeItem: function(inSender, inEvent) {
        // because setting it on the list itself fails:
        this.$.MainList.setPersistSwipeableItem(true);
        this.activeItem = inEvent.index;
    },

	filterAndRefresh: function() {
		//TODO: Fix double render bug.
		this.filter()
		this.refreshList(this.$.stickySources, this.folder.stickySubscriptions)
		this.$.MainList.setCount(this.subscriptions.items.length);
		if(!this.subscriptions.items.length) {
			//TODO: Trigger goback
			//this.controller.stageController.popScene()
		}
		this.$.stickySources.render();
		this.$.MainList.refresh()
	},

	filter: function() {
		this.subscriptions.items.clear()

		this.folder.subscriptions.items.each(function(subscription) {
			if(subscription.unreadCount || !Preferences.hideReadFeeds()) {
				this.subscriptions.items.push(subscription)
			}
		}.bind(this))
	},

	sourceTapped: function(inSender, inEvent) {
		this.doSwitchPanels({target: "feed", api: this.api, subscription: inEvent, previousPage: this})
		return true;
	},

	listSourceTapped: function(inSender, inEvent) {
		var i = inEvent.index;
		var item = this.subscriptions.items[i];
		this.doSwitchPanels({target: "feed", api: this.api, subscription: item, previousPage: this})
		return true
	},

    deleteButtonTapped: function(inSender, inEvent) {
        this.$.MainList.setPersistSwipeableItem(false);
        this.sourceDeleted(this.activeItem); 
        this.$.MainList.completeSwipe();
   		this.$.MainList.setCount(this.subscriptions.items);
   		this.$.stickySources.render();
   		this.$.MainList.refresh();
    },

    cancelButtonTapped: function(inSender, inEvent) {
        this.$.MainList.setPersistSwipeableItem(false);
        this.$.MainList.completeSwipe()
    },

	sourcesReordered: function(inSender, inEvent) {
		var beforeSubscription = null

		if(inEvent.reorderTo < this.subscriptions.items.length - 1) {
			var beforeIndex = inEvent.reorderTo

			if(inEvent.reorderFrom < inEvent.reorderTo) {
				beforeIndex += 1
			}

			beforeSubscription = this.subscriptions.items[beforeIndex]
		}

		this.folder.subscriptions.move(this.subscriptions.items[inEvent.reorderFrom], beforeSubscription)
		this.subscriptions.items = enyo.clone(this.folder.subscriptions.items)
		this.$.MainList.refresh()
	},

	sourceDeleted: function(event) {
		var unreadCount = (this.subscriptions.items[event].unreadCount)
		this.folder.subscriptions.remove(this.subscriptions.items[event])
		this.subscriptions.items = enyo.clone(this.folder.subscriptions.items)
		this.folder.recalculateUnreadCounts()
	},

//PORT FROM HERE
	refresh: function() {
		if(!self.refreshing) {
			this.refreshing = true
			this.smallSpinnerOn()
			Mojo.Event.send(document, Feeder.Event.refreshWanted, {})
		}
	},

	refreshComplete: function(event) {
		var self = this
		this.refreshing = false

		event.sources.subscriptions.items.each(function(subscription) {
			if(self.folder.id == subscription.id) {
				self.folder = subscription
				throw $break
			}
		})

		this.filterAndRefresh()
		this.smallSpinnerOff()
	},
	
	handleGoBack: function() {
		this.doGoBack({lastPage: this.previousPage})
	},	
});