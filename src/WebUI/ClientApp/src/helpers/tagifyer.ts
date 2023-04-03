import { TagData, TagifySettings, TagifyService } from 'ngx-tagify';


export default class Tagifyer {
  static Settings() {
    var settings: TagifySettings = {
      placeholder: 'Press tab to add new tag',
      blacklist: ['fucking', 'shit'],
      callbacks: {
        click: (e) => { console.log(e.detail); }
      }
    };

    return settings;
  }

  static AddDefaultTags(elementName: string, tags: any[]): void {
    var tagifySvc: TagifyService;
    tagifySvc.get(elementName).add(tags);
  }
}
