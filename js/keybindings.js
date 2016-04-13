/* defines keybindings that aren't in the menu (so they aren't defined by menu.js). For items in the menu, also handles ipc messages */

ipc.on("zoomIn", function () {
	getWebview(tabs.getSelected()).send("zoomIn");
});

ipc.on("zoomOut", function () {
	getWebview(tabs.getSelected()).send("zoomOut");
});

ipc.on("zoomReset", function () {
	getWebview(tabs.getSelected()).send("zoomReset");
});

ipc.on("print", function () {
	getWebview(tabs.getSelected()).print();
})

ipc.on("findInPage", function () {
	findinpage.start();
})

ipc.on("inspectPage", function () {
	getWebview(tabs.getSelected()).openDevTools();
});

ipc.on("showReadingList", function () {
	readerView.showReadingList();
})

ipc.on("addTab", function (e, data) {

	/* new tabs can't be created in focus mode */
	if (isFocusMode) {
		showFocusModeError();
		return;
	}

	var newIndex = tabs.getIndex(tabs.getSelected()) + 1;
	var newTab = tabs.add({
		url: data.url || "",
	}, newIndex);

	addTab(newTab, {
		enterEditMode: !data.url, //only enter edit mode if the new tab is about:blank
	});
});

function addPrivateTab() {


	/* new tabs can't be created in focus mode */
	if (isFocusMode) {
		showFocusModeError();
		return;
	}


	if (isEmpty(tabs.get())) {
		destroyTab(tabs.getAtIndex(0).id);
	}

	var newIndex = tabs.getIndex(tabs.getSelected()) + 1;

	var privateTab = tabs.add({
		url: "about:blank",
		private: true,
	}, newIndex)
	addTab(privateTab);
}

ipc.on("addPrivateTab", addPrivateTab);

require.async("mousetrap", function (Mousetrap) {
	window.Mousetrap = Mousetrap;

	Mousetrap.bind("shift+mod+p", addPrivateTab);

	Mousetrap.bind(["mod+l", "mod+k"], function (e) {
		enterEditMode(tabs.getSelected());
		return false;
	})

	Mousetrap.bind("mod+w", function (e) {

		//prevent mod+w from closing the window
		e.preventDefault();
		e.stopImmediatePropagation();


		/* disabled in focus mode */
		if (isFocusMode) {
			showFocusModeError();
			return;
		}

		var currentTab = tabs.getSelected();
		var currentIndex = tabs.getIndex(currentTab);
		var nextTab = tabs.getAtIndex(currentIndex - 1) || tabs.getAtIndex(currentIndex + 1);

		destroyTab(currentTab);
		if (nextTab) {
			switchToTab(nextTab.id);
		} else {
			addTab();
		}

		if (tabs.count() == 1) { //there isn't any point in being in expanded mode any longer
			leaveExpandedMode();
		}

		return false;
	});

	Mousetrap.bind("mod+d", function (e) {
		bookmarks.handleStarClick(getTabElement(tabs.getSelected()).querySelector(".bookmarks-button"));
		enterEditMode(tabs.getSelected()); //we need to show the bookmarks button, which is only visible in edit mode
	});

	// cmd+x should switch to tab x. Cmd+9 should switch to the last tab

	for (var i = 1; i < 9; i++) {
		(function (i) {
			Mousetrap.bind("mod+" + i, function (e) {
				var currentIndex = tabs.getIndex(tabs.getSelected());
				var newTab = tabs.getAtIndex(currentIndex + i) || tabs.getAtIndex(currentIndex - i);
				if (newTab) {
					switchToTab(newTab.id);
				}
			})

			Mousetrap.bind("shift+mod+" + i, function (e) {
				var currentIndex = tabs.getIndex(tabs.getSelected());
				var newTab = tabs.getAtIndex(currentIndex - i) || tabs.getAtIndex(currentIndex + i);
				if (newTab) {
					switchToTab(newTab.id);
				}
			})

		})(i);
	}

	Mousetrap.bind("mod+9", function (e) {
		switchToTab(tabs.getAtIndex(tabs.count() - 1).id);
	})

	Mousetrap.bind("shift+mod+9", function (e) {
		switchToTab(tabs.getAtIndex(0).id);
	})

	Mousetrap.bind("esc", function (e) {
		leaveTabEditMode();
		leaveExpandedMode();
		if (findinpage.isEnabled) {
			findinpage.end(); //this also focuses the webview
		} else {
			getWebview(tabs.getSelected()).focus();
		}
	});

	Mousetrap.bind("shift+mod+r", function () {
		var tab = tabs.get(tabs.getSelected());

		if (tab.isReaderView) {
			readerView.exit(tab.id);
		} else {
			readerView.enter(tab.id);
		}
	});

	//TODO add help docs for this

	Mousetrap.bind("mod+left", function (d) {
		var currentIndex = tabs.getIndex(tabs.getSelected());
		var previousTab = tabs.getAtIndex(currentIndex - 1);

		if (previousTab) {
			switchToTab(previousTab.id);
		} else {
			switchToTab(tabs.getAtIndex(tabs.count() - 1).id);
		}
	});

	Mousetrap.bind("mod+right", function (d) {
		var currentIndex = tabs.getIndex(tabs.getSelected());
		var nextTab = tabs.getAtIndex(currentIndex + 1);

		if (nextTab) {
			switchToTab(nextTab.id);
		} else {
			switchToTab(tabs.getAtIndex(0).id);
		}
	});

	Mousetrap.bind(["option+mod+left", "shift+ctrl+tab"], function (d) {

		enterExpandedMode(); //show the detailed tab switcher

		var currentIndex = tabs.getIndex(tabs.getSelected());
		var previousTab = tabs.getAtIndex(currentIndex - 1);

		if (previousTab) {
			switchToTab(previousTab.id);
		} else {
			switchToTab(tabs.getAtIndex(tabs.count() - 1).id);
		}
	});

	Mousetrap.bind(["option+mod+right", "ctrl+tab"], function (d) {

		enterExpandedMode();

		var currentIndex = tabs.getIndex(tabs.getSelected());
		var nextTab = tabs.getAtIndex(currentIndex + 1);

		if (nextTab) {
			switchToTab(nextTab.id);
		} else {
			switchToTab(tabs.getAtIndex(0).id);
		}
	});

	Mousetrap.bind("mod+n", function (d) { //destroys all current tabs, and creates a new, empty tab. Kind of like creating a new window, except the old window disappears.

		var tset = tabs.get();
		for (var i = 0; i < tset.length; i++) {
			destroyTab(tset[i].id);
		}

		addTab(); //create a new, blank tab
	});

	//return exits expanded mode

	Mousetrap.bind("return", function () {
		if (isExpandedMode) {
			leaveExpandedMode();
			getWebview(tabs.getSelected()).focus();
		}
	});

	Mousetrap.bind("shift+mod+e", function () {
		if (!isExpandedMode) {
			enterExpandedMode();
		} else {
			leaveExpandedMode();
		}
	});

	Mousetrap.bind("shift+mod+b", function () {
		clearSearchbar();
		showSearchbar(getTabInput(tabs.getSelected()));
		enterEditMode(tabs.getSelected());
		showAllBookmarks();
	});

}); //end require mousetrap

document.body.addEventListener("keyup", function (e) {
	if (e.keyCode == 17) { //ctrl key
		leaveExpandedMode();
	}
});
