import {
  ChangeDetectionStrategy,
  ChangeDetectorRef,
  Component,
  ElementRef,
  Input,
  NgZone,
  OnDestroy,
  OnInit,
  ViewChild,
  forwardRef,
  inject,
} from '@angular/core';
import { ControlValueAccessor, NG_VALUE_ACCESSOR } from '@angular/forms';
import type { Editor } from '@tiptap/core';
import type { SuggestionKeyDownProps, SuggestionProps } from '@tiptap/suggestion';
import { Subscription } from 'rxjs';
import {
  faAt,
  faBold,
  faHeading,
  faItalic,
  faListOl,
  faListUl,
  faQuoteRight,
  faStrikethrough,
} from '@fortawesome/free-solid-svg-icons';

import { MENTION_TYPE_LABELS, MentionService, MentionTarget } from '../../../core/services/mention.service';
import type { MentionAttrs } from '../../markdown/editor';

interface SuggestionState {
  items: MentionTarget[];
  selected: number;
  left: number;
  top: number;
  command: (attrs: MentionAttrs) => void;
}

/**
 * The one editor for every long text in the app. A form control whose value
 * is Markdown, so it drops into the existing `TEXT` columns.
 *
 * Typing `@` (or the @ button) opens a picker of people, places, quests and
 * notes; the choice is stored as `[Name](mention:type/uuid)`.
 *
 * The value is only re-emitted once the user edits: opening a form must not
 * rewrite a text that was written before the editor existed.
 *
 * Tiptap is loaded when the first editor opens (see markdown/editor.ts);
 * `ready` resolves once this one exists.
 */
@Component({
  selector: 'app-rich-text-editor',
  templateUrl: './rich-text-editor.component.html',
  styleUrls: ['./rich-text-editor.component.scss'],
  changeDetection: ChangeDetectionStrategy.Eager,
  standalone: false,
  providers: [{
    provide: NG_VALUE_ACCESSOR,
    useExisting: forwardRef(() => RichTextEditorComponent),
    multi: true,
  }],
})
export class RichTextEditorComponent implements ControlValueAccessor, OnInit, OnDestroy {
  private cdr = inject(ChangeDetectorRef);
  private host = inject<ElementRef<HTMLElement>>(ElementRef);
  private mentions = inject(MentionService);
  private zone = inject(NgZone);

  /** Lets a `<label for="…">` focus the editor. */
  @Input() inputId: string;
  @ViewChild('content', { static: true }) content: ElementRef<HTMLDivElement>;

  editor: Editor | undefined;
  /** Resolves once the editor is loaded and created. */
  ready: Promise<void> = Promise.resolve();
  suggestion: SuggestionState | null = null;
  typeLabels = MENTION_TYPE_LABELS;
  icons = {
    at: faAt,
    bold: faBold,
    heading: faHeading,
    italic: faItalic,
    listOl: faListOl,
    listUl: faListUl,
    quote: faQuoteRight,
    strike: faStrikethrough,
  };

  private closeMentionPicker: () => void = () => {};
  private destroyed = false;
  private disabled = false;
  private onChange: (value: string) => void = () => {};
  private onTouched: () => void = () => {};
  private targets: MentionTarget[] = [];
  private subscription = new Subscription();
  /** The Markdown last written in or emitted, to skip no-op updates. */
  private value = '';


  ngOnInit() {
    this.subscription.add(
      this.mentions.getTargets().subscribe(targets => this.targets = targets)
    );
    this.ready = this.createEditor();
  }


  private async createEditor() {
    const { createRichTextEditor } = await import('../../markdown/editor');
    if (this.destroyed) {
      return;
    }
    const handle = createRichTextEditor({
      element: this.content.nativeElement,
      content: this.value,
      editable: !this.disabled,
      inputId: this.inputId,
      searchMentions: query => this.mentions.search(this.targets, query),
      onSuggestion: {
        show: props => this.zone.run(() => this.showSuggestion(props)),
        key: props => this.zone.run(() => this.onSuggestionKey(props)),
        hide: () => this.zone.run(() => this.hideSuggestion()),
      },
      onUpdate: () => this.emitIfChanged(),
      onBlur: () => this.onTouched(),
      onTransaction: () => this.cdr.markForCheck(),
    });
    this.editor = handle.editor;
    this.closeMentionPicker = handle.closeMentionPicker;
    this.cdr.markForCheck();
  }


  ngOnDestroy() {
    this.destroyed = true;
    this.subscription.unsubscribe();
    this.editor?.destroy();
  }


  writeValue(value: string | null): void {
    this.value = value ?? '';
    if (this.editor && this.value !== this.editor.getMarkdown()) {
      this.editor.commands.setContent(this.value, { contentType: 'markdown', emitUpdate: false });
    }
  }


  registerOnChange(fn: (value: string) => void): void {
    this.onChange = fn;
  }


  registerOnTouched(fn: () => void): void {
    this.onTouched = fn;
  }


  setDisabledState(isDisabled: boolean): void {
    this.disabled = isDisabled;
    this.editor?.setEditable(!isDisabled);
  }


  /** Toolbar commands. `mousedown` keeps focus (and selection) in the editor. */
  run(event: Event, command: 'bold' | 'italic' | 'strike' | 'heading' | 'bulletList' | 'orderedList' | 'blockquote' | 'mention') {
    event.preventDefault();
    if (!this.editor) {
      return;
    }
    const chain = this.editor.chain().focus();
    switch (command) {
      case 'bold': chain.toggleBold().run(); break;
      case 'italic': chain.toggleItalic().run(); break;
      case 'strike': chain.toggleStrike().run(); break;
      case 'heading': chain.toggleHeading({ level: 3 }).run(); break;
      case 'bulletList': chain.toggleBulletList().run(); break;
      case 'orderedList': chain.toggleOrderedList().run(); break;
      case 'blockquote': chain.toggleBlockquote().run(); break;
      case 'mention': {
        // The picker only opens after a space or at the start of a line.
        const { $from } = this.editor.state.selection;
        const before = $from.parent.textBetween(Math.max(0, $from.parentOffset - 1), $from.parentOffset);
        chain.insertContent(before && !/\s/.test(before) ? ' @' : '@').run();
        break;
      }
    }
  }


  isActive(name: string, attrs?: Record<string, unknown>): boolean {
    return !!this.editor?.isActive(name, attrs);
  }


  pick(event: Event, item: MentionTarget) {
    event.preventDefault();
    this.suggestion?.command({ id: item.entityId, label: item.name, entityType: item.entityType });
  }


  private emitIfChanged() {
    const markdown = this.editor!.getMarkdown();
    if (markdown !== this.value) {
      this.value = markdown;
      this.onChange(markdown);
    }
  }


  private showSuggestion(props: SuggestionProps<MentionTarget, MentionAttrs>) {
    const caret = props.clientRect?.();
    const hostRect = this.host.nativeElement.getBoundingClientRect();
    const selected = this.suggestion && props.items.length ? Math.min(this.suggestion.selected, props.items.length - 1) : 0;
    this.suggestion = {
      items: props.items,
      selected,
      left: caret ? caret.left - hostRect.left : 0,
      top: caret ? caret.bottom - hostRect.top + 4 : 0,
      command: props.command,
    };
  }


  private hideSuggestion() {
    this.suggestion = null;
  }


  private onSuggestionKey({ event }: SuggestionKeyDownProps): boolean {
    const state = this.suggestion;
    if (!state) {
      return false;
    }
    if (event.key === 'Escape') {
      this.closeMentionPicker();
      this.hideSuggestion();
      return true;
    }
    if (state.items.length === 0) {
      return false;
    }
    switch (event.key) {
      case 'ArrowDown':
        state.selected = (state.selected + 1) % state.items.length;
        return true;
      case 'ArrowUp':
        state.selected = (state.selected + state.items.length - 1) % state.items.length;
        return true;
      case 'Enter':
      case 'Tab': {
        const item = state.items[state.selected];
        state.command({ id: item.entityId, label: item.name, entityType: item.entityType });
        return true;
      }
      default:
        return false;
    }
  }
}
