import * as serviceList from "./serviceList.js";
import * as content from "./content.js";
import { shouldDisplayWarning } from "../limiter.js";
import * as browserUtil from "../browserUtil.js";

class MusicService extends serviceList.Service {
  async tabActivation() {
    if (this.tabCreated) {
      const isAudible = await this.pollTabAudible(this.tab.id, 3000);
      if (!isAudible) {
        const activeTabId = (await browserUtil.activeTab()).id;
        browserUtil.makeTabActive(this.tab);
        const nowAudible = await this.pollTabAudible(this.tab.id, 1000);
        if (
          nowAudible ||
          !(await shouldDisplayWarning(`${this.id}Audible`, {
            times: 3,
            frequency: 1000,
          }))
        ) {
          if (this.tab.id !== activeTabId) {
            browserUtil.makeTabActive(activeTabId);
          }
        } else {
          this.context.failedAutoplay(this.tab);
        }
      }
    }
  }

  async playQuery(query) {
    try {
      await this.initTab(`/services/${this.id}/player.content.js`);
      try {
        await this.callTab("search", { query, thenPlay: true });
        await this.tabActivation();
      } catch (e) {
        if (e.message.includes("No search results")) {
          e.displayMessage = `No results found for ${query}`;
        } else if (e.message.includes("Timeout during search")) {
          e.displayMessage = `Encountered slow internet`;
        }
        throw e;
      }
    } catch (e) {
      if (e.message === "You must enable DRM.") {
        e.displayMessage = "You must enable DRM.";
      }
      throw e;
    }
  }

  async move(direction) {
    const tabs = await this.getAllTabs();
    if (!tabs.length) {
      const e = new Error(`${this.title} is not open`);
      e.displayMessage = `${this.title} is not open`;
      throw e;
    }
    for (const tab of tabs) {
      await content.inject(tab.id, `/services/${this.id}/player.content.js`);
      await this.callOneTab(tab.id, "move", { direction });
    }
  }

  async pause() {
    await this.initTab(`/services/${this.id}/player.content.js`);
    await this.callTab("pause");
  }

  async unpause() {
    await this.initTab(`/services/${this.id}/player.content.js`);
    await this.callTab("unpause");
  }

  async playAlbum(query) {
    await this.initTab(`/services/${this.id}/player.content.js`);
    await this.callTab("playAlbum", { query, thenPlay: true });
    await this.tabActivation();
  }

  async playPlaylist(query) {
    await this.initTab(`/services/${this.id}/player.content.js`);
    await this.callTab("playPlaylist", { query, thenPlay: true });
    await this.tabActivation();
  }

  async pauseAny(options) {
    const exceptTabId = options && options.exceptTabId;
    for (const tab of await this.getAllTabs({ audible: true })) {
      if (exceptTabId && exceptTabId === tab.id) {
        continue;
      }
      await content.inject(tab.id, `/services/${this.id}/player.content.js`);
      await this.callOneTab(tab.id, "pause");
    }
  }

  async adjustVolume(inputVolume, volumeLevel) {
    const findAudibleTab = true;
    await this.initTab(
      `/services/${this.id}/player.content.js`,
      findAudibleTab
    );
    await this.callTab("adjustVolume", { inputVolume, volumeLevel });
  }

  async mute() {
    await this.initTab(`/services/${this.id}/player.content.js`);
    await this.callTab("mute");
  }

  async unmute() {
    await this.initTab(`/services/${this.id}/player.content.js`);
    await this.callTab("unmute");
  }
}

export default MusicService;
