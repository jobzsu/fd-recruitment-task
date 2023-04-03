import { Component, TemplateRef, OnInit } from '@angular/core';
import { UntypedFormBuilder } from '@angular/forms';
import { BsModalService, BsModalRef } from 'ngx-bootstrap/modal';
import Tagifyer from '../../helpers/tagifyer';

import {
  TodoListsClient, TodoItemsClient,
  TodoListDto, TodoItemDto, PriorityLevelDto,
  CreateTodoListCommand, UpdateTodoListCommand,
  CreateTodoItemCommand, UpdateTodoItemDetailCommand, IColourDto
} from '../web-api-client';


@Component({
  selector: 'app-todo-component',
  templateUrl: './todo.component.html',
  styleUrls: ['./todo.component.scss']
})
export class TodoComponent implements OnInit {
  debug = false;
  deleting = false;
  deleteCountDown = 0;
  deleteCountDownInterval: any;
  lists: TodoListDto[];
  priorityLevels: PriorityLevelDto[];
  colours: IColourDto[] = [];
  selectedList: TodoListDto;
  selectedItem: TodoItemDto;
  selectedItemTags: any[] = [];
  selectedListItemTags: any[] = [];
  newListEditor: any = {};
  listOptionsEditor: any = {};
  newListModalRef: BsModalRef;
  listOptionsModalRef: BsModalRef;
  deleteListModalRef: BsModalRef;
  itemDetailsModalRef: BsModalRef;
  itemDetailsFormGroup = this.fb.group({
    id: [null],
    listId: [null],
    priority: [''],
    note: [''],
    colour: [''],
    tags: ['']
  });
  tagifyerSettings: any = Tagifyer.Settings();
  ignoreOnAddOrRemoveTagEvent: boolean = true;
  selectedListBaseItems?: TodoItemDto[];


  constructor(
    private listsClient: TodoListsClient,
    private itemsClient: TodoItemsClient,
    private modalService: BsModalService,
    private fb: UntypedFormBuilder
  ) { }

  private setColours(): void {
    this.colours.push({ name: 'White', code: '#FFFFFF' });
    this.colours.push({ name: 'Red', code: '#FF5733' });
    this.colours.push({ name: 'Orange', code: '#FFC300' });
    this.colours.push({ name: 'Yellow', code: '#FFFF66' });
    this.colours.push({ name: 'Green', code: '#CCFF99' });
    this.colours.push({ name: 'Blue', code: '#6666FF' });
    this.colours.push({ name: 'Purple', code: '#9966CC' });
    this.colours.push({ name: 'Grey', code: '#999999' });
  }

  ngOnInit(): void {
    this.setColours();
    this.listsClient.get().subscribe(
      result => {
        this.lists = result.lists;
        this.priorityLevels = result.priorityLevels;
        if (this.lists.length) {
          this.selectedList = this.lists[0];
          this.selectedListBaseItems = [...this.selectedList.items];
          this.resetSelectedListTags();
        }
      },
      error => console.error(error)
    );
  }

  // Lists
  remainingItems(list: TodoListDto): number {
    return list.items.filter(t => !t.done).length;
  }

  showNewListModal(template: TemplateRef<any>): void {
    this.newListModalRef = this.modalService.show(template);
    setTimeout(() => document.getElementById('title').focus(), 250);
  }

  newListCancelled(): void {
    this.newListModalRef.hide();
    this.newListEditor = {};
  }

  addList(): void {
    const list = {
      id: 0,
      title: this.newListEditor.title,
      items: []
    } as TodoListDto;

    this.listsClient.create(list as CreateTodoListCommand).subscribe(
      result => {
        list.id = result;
        this.lists.push(list);
        this.selectedList = list;
        this.selectedListBaseItems = [...list.items];
        this.resetSelectedListTags();
        this.newListModalRef.hide();
        this.newListEditor = {};
      },
      error => {
        const errors = JSON.parse(error.response);

        if (errors && errors.Title) {
          this.newListEditor.error = errors.Title[0];
        }

        setTimeout(() => document.getElementById('title').focus(), 250);
      }
    );
  }

  showListOptionsModal(template: TemplateRef<any>) {
    this.listOptionsEditor = {
      id: this.selectedList.id,
      title: this.selectedList.title
    };

    this.listOptionsModalRef = this.modalService.show(template);
  }

  updateListOptions() {
    const list = this.listOptionsEditor as UpdateTodoListCommand;
    this.listsClient.update(this.selectedList.id, list).subscribe(
      () => {
        (this.selectedList.title = this.listOptionsEditor.title),
          this.listOptionsModalRef.hide();
        this.listOptionsEditor = {};
      },
      error => console.error(error)
    );
  }

  confirmDeleteList(template: TemplateRef<any>) {
    this.listOptionsModalRef.hide();
    this.deleteListModalRef = this.modalService.show(template);
  }

  deleteListConfirmed(): void {
    this.listsClient.delete(this.selectedList.id).subscribe(
      () => {
        this.deleteListModalRef.hide();
        this.lists = this.lists.filter(t => t.id !== this.selectedList.id);
        this.selectedList = this.lists.length ? this.lists[0] : null;
      },
      error => console.error(error)
    );
  }

  // Items
  showItemDetailsModal(template: TemplateRef<any>, item: TodoItemDto): void {
    this.selectedItem = item;
    this.itemDetailsFormGroup.patchValue(this.selectedItem);
    this.parseStrToTag();
    this.itemDetailsModalRef = this.modalService.show(template);
    this.itemDetailsModalRef.onHidden.subscribe(() => {
        this.stopDeleteCountDown();
    });
  }

  private parseStrToTag(): void {
    this.selectedItemTags = [];
    if (this.selectedItem != null && this.selectedItem.tags != null) {
      this.selectedItem.tags.split(',').forEach(t => {
        this.selectedItemTags = this.selectedItemTags.concat([{ value: t.trim() }]);
      })
    }
  }

  private parseTagsToStr(): any {
    return this.selectedItemTags.length > 0 ?
      this.selectedItemTags.map(t => t.value).join(',') : null;
  }

  onTagAddEvent(tag: any): void {
    if (!this.ignoreOnAddOrRemoveTagEvent) {
      if (this.selectedListBaseItems.length > 0) {
        var searchTags: string[] = tag.tags.map(v => v.value);
        var filteredItems: any[] = [];
        this.selectedListBaseItems.forEach(i => {
          if (i.tags != null && searchTags.some(st => i.tags.split(',').includes(st))) {
            filteredItems.push(i);
          }
        });
        this.selectedList.items = [...filteredItems];
      }
    }
  }

  onTagRemoveEvent(tags: any): void {
    if (!this.ignoreOnAddOrRemoveTagEvent) {
      if (tags.length === 0) {
        this.selectedList.items = [...this.selectedListBaseItems];
      } else {
        var searchTags: string[] = tags.map(t => t.value);
        var filteredItems: any[] = [];
        this.selectedListBaseItems.forEach(i => {
          if (i.tags != null && searchTags.every(st => i.tags.split(',').includes(st))) {
            filteredItems.push(i);
          }
        });
        this.selectedList.items = [...filteredItems];
      }
    }
  }

  private resetSelectedListTags(): void {

    this.ignoreOnAddOrRemoveTagEvent = true;

    this.selectedListItemTags = [];

    if (this.selectedList.items.length > 0) {
      this.selectedList.items.forEach(i => {
        if (i.tags != null) {
          i.tags.split(',').forEach(t => {
            this.selectedListItemTags = this.selectedListItemTags.concat([{ value: t.trim().toLowerCase() }]);
          });
        }
      });
    }

    setTimeout(() => {
      this.ignoreOnAddOrRemoveTagEvent = false;
    }, 500);
  }

  updateSelectedList(list: any): void {
    this.selectedList = list;
    this.selectedListBaseItems = [...this.selectedList.items];

    this.resetSelectedListTags();
  }

  updateSelectedListItems(): void {
    this.selectedList.items = [...this.selectedListBaseItems];

    this.resetSelectedListTags();
  }

  updateItemDetails(): void {
    this.itemDetailsFormGroup.controls['tags'].setValue(this.parseTagsToStr());

    const item = new UpdateTodoItemDetailCommand(this.itemDetailsFormGroup.value);
    console.log(item);
    this.itemsClient.updateItemDetails(this.selectedItem.id, item).subscribe(
      () => {
        if (this.selectedItem.listId !== item.listId) {
          this.selectedList.items = this.selectedList.items.filter(
            i => i.id !== this.selectedItem.id
          );
          const listIndex = this.lists.findIndex(
            l => l.id === item.listId
          );
          this.selectedItem.listId = item.listId;
          this.lists[listIndex].items.push(this.selectedItem);
        }

        this.selectedItem.priority = item.priority;
        this.selectedItem.note = item.note;
        this.selectedItem.colour = item.colour;
        this.selectedItem.tags = item.tags;
        this.itemDetailsModalRef.hide();
        this.itemDetailsFormGroup.reset();

        this.resetSelectedListTags();
      },
      error => console.error(error)
    );
  }

  addItem() {
    const item = {
      id: 0,
      listId: this.selectedList.id,
      priority: this.priorityLevels[0].value,
      title: '',
      done: false,
      colour: this.colours[0].code,
    } as TodoItemDto;

    //this.selectedList.items.push(item);
    //const index = this.selectedList.items.length - 1;
    //this.editItem(item, 'itemTitle' + index);

    this.selectedListBaseItems.push(item);
    this.selectedList.items.push(item);
    const index = this.selectedListBaseItems.length - 1;
    this.editItem(item, 'itemTitle' + index);
  }

  editItem(item: TodoItemDto, inputId: string): void {
    this.selectedItem = item;
    setTimeout(() => document.getElementById(inputId).focus(), 100);
  }

  updateItem(item: TodoItemDto, pressedEnter: boolean = false): void {
    const isNewItem = item.id === 0;

    if (!item.title.trim()) {
      this.deleteItem(item);
      return;
    }

    if (item.id === 0) {
      this.itemsClient
        .create({
          ...item, listId: this.selectedList.id
        } as CreateTodoItemCommand)
        .subscribe(
          result => {
            item.id = result;
          },
          error => console.error(error)
        );
    } else {
      this.itemsClient.update(item.id, item).subscribe(
        () => console.log('Update succeeded.'),
        error => console.error(error)
      );
    }

    this.selectedItem = null;

    if (isNewItem && pressedEnter) {
      setTimeout(() => this.addItem(), 250);
    }
  }

  deleteItem(item: TodoItemDto, countDown?: boolean) {
    if (countDown) {
      if (this.deleting) {
        this.stopDeleteCountDown();
        return;
      }
      this.deleteCountDown = 3;
      this.deleting = true;
      this.deleteCountDownInterval = setInterval(() => {
        if (this.deleting && --this.deleteCountDown <= 0) {
          this.deleteItem(item, false);
        }
      }, 1000);
      return;
    }
    this.deleting = false;
    if (this.itemDetailsModalRef) {
      this.itemDetailsModalRef.hide();
    }

    if (item.id === 0) {
      //const itemIndex = this.selectedList.items.indexOf(this.selectedItem);
      const itemIndex = this.selectedListBaseItems.indexOf(this.selectedItem);
      this.selectedListBaseItems.splice(itemIndex, 1);
      this.selectedList.items = [...this.selectedListBaseItems];
    } else {
      this.itemsClient.delete(item.id).subscribe(
        () => {
          const itemIndex = this.selectedListBaseItems.indexOf(this.selectedItem);
          this.selectedListBaseItems.splice(itemIndex, 1);
          this.selectedList.items = [...this.selectedListBaseItems];
        },
        //(this.selectedList.items = this.selectedList.items.filter(
        //  t => t.id !== item.id
        //)),
        error => console.error(error)
      );
    }
  }

  stopDeleteCountDown() {
    clearInterval(this.deleteCountDownInterval);
    this.deleteCountDown = 0;
    this.deleting = false;
  }
}
