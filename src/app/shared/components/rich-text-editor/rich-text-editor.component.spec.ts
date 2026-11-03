import { Component } from '@angular/core';
import { ComponentFixture, TestBed, fakeAsync, flush } from '@angular/core/testing';
import { FormControl, ReactiveFormsModule, Validators } from '@angular/forms';
import { FontAwesomeModule } from '@fortawesome/angular-fontawesome';
import { of } from 'rxjs';

import { RichTextEditorComponent } from './rich-text-editor.component';
import { MentionService, MentionTarget } from '../../../core/services/mention.service';

const PERSON = '11111111-1111-4111-8111-111111111111';

@Component({
  template: '<app-rich-text-editor inputId="content" [formControl]="control"></app-rich-text-editor>',
  standalone: false,
})
class HostComponent {
  control = new FormControl('Erste Zeile\nZweite Zeile', Validators.required);
}

describe('RichTextEditorComponent', () => {
  let fixture: ComponentFixture<HostComponent>;
  let host: HostComponent;
  let editor: RichTextEditorComponent;
  const targets: MentionTarget[] = [
    { entityType: 'person', entityId: PERSON, name: 'Alrik' },
    { entityType: 'place', entityId: '22222222-2222-4222-8222-222222222222', name: 'Gareth' },
  ];

  beforeEach(async () => {
    const realSearch = MentionService.prototype.search;
    await TestBed.configureTestingModule({
      imports: [ReactiveFormsModule, FontAwesomeModule],
      declarations: [HostComponent, RichTextEditorComponent],
      providers: [{
        provide: MentionService,
        useValue: {
          getTargets: () => of(targets),
          search: (list: MentionTarget[], query: string) => realSearch.call(null, list, query),
        },
      }],
    }).compileComponents();

    fixture = TestBed.createComponent(HostComponent);
    host = fixture.componentInstance;
    fixture.detectChanges();
    editor = fixture.debugElement.children[0].componentInstance;
    await editor.ready;
  });

  afterEach(() => fixture.destroy());

  it('shows the control value', () => {
    expect(editor.editor!.getText()).toContain('Erste Zeile');
    expect(editor.editor!.getMarkdown()).toBe('Erste Zeile\nZweite Zeile');
  });

  it('labels the editable area with the given id', () => {
    expect(fixture.nativeElement.querySelector('#content.rich-text-content')).not.toBeNull();
  });

  it('does not mark the control dirty or change its value just by showing it', () => {
    host.control.setValue('Text mit  \nzwei Leerzeichen');
    fixture.detectChanges();
    expect(host.control.value).toBe('Text mit  \nzwei Leerzeichen');
    expect(host.control.dirty).toBeFalse();
  });

  it('writes edits back as Markdown', () => {
    editor.editor!.commands.setContent('**neu**', { contentType: 'markdown', emitUpdate: true } as any);
    expect(host.control.value).toBe('**neu**');
    expect(host.control.dirty).toBeTrue();
  });

  it('is empty, and so invalid when required, after clearing', () => {
    editor.editor!.commands.clearContent(true);
    expect(host.control.value).toBe('');
    expect(host.control.valid).toBeFalse();
  });

  it('follows the disabled state', () => {
    host.control.disable();
    expect(editor.editor!.isEditable).toBeFalse();
    host.control.enable();
    expect(editor.editor!.isEditable).toBeTrue();
  });

  it('applies toolbar commands', () => {
    editor.editor!.commands.selectAll();
    editor.run(new Event('mousedown'), 'bold');
    // Bold cannot span a line break in Markdown, so each line gets its own.
    expect(host.control.value).toBe('**Erste Zeile**\n**Zweite Zeile**');
  });

  it('suggests targets after @ and inserts the pick as a mention link', fakeAsync(() => {
    editor.editor!.commands.setContent('Hallo', { contentType: 'markdown' } as any);
    editor.editor!.commands.focus('end');
    editor.editor!.commands.insertContent(' @Alr');
    flush();
    fixture.detectChanges();

    expect(editor.suggestion?.items.map(item => item.name)).toEqual(['Alrik']);
    const option = fixture.nativeElement.querySelector('.mention-picker li');
    expect(option.textContent).toContain('Alrik');

    // Tiptap collapses the window selection after inserting, and a headless
    // browser without focus has none to collapse.
    spyOn(window, 'getSelection').and.returnValue({ collapseToEnd: () => {} } as any);
    option.dispatchEvent(new MouseEvent('mousedown', { cancelable: true }));
    flush();
    expect(host.control.value).toMatch(new RegExp(`^Hallo \\[Alrik\\]\\(mention:person/${PERSON}\\) ?$`));
  }));
});
