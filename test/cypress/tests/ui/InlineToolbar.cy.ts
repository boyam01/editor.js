import Header from '@editorjs/header';
import type { InlineTool, MenuConfig } from '../../../../types/tools';
import { createEditorWithTextBlocks } from '../../support/utils/createEditorWithTextBlocks';

describe('Inline Toolbar', () => {
  describe('Separators', () => {
    it('should have a separator after the first item if it has children', () => {
      cy.createEditor({
        tools: {
          header: {
            class: Header,
          },
        },
        data: {
          blocks: [
            {
              type: 'paragraph',
              data: {
                text: 'First block text',
              },
            },
          ],
        },
      });

      /** Open Inline Toolbar */
      cy.get('[data-cy=editorjs]')
        .find('.ce-paragraph')
        .selectText('block');

      /** Check that first item (which is convert-to and has children) has a separator after it */
      cy.get('[data-cy=editorjs]')
        .get('[data-cy=inline-toolbar] .ce-popover__items')
        .children()
        .first()
        .should('have.attr', 'data-item-name', 'convert-to');

      cy.get('[data-cy=editorjs]')
        .get('[data-cy=inline-toolbar] .ce-popover__items')
        .children()
        .eq(1)
        .should('have.class', 'ce-popover-item-separator');
    });

    it('should have separators from both sides of item if it is in the middle and has children', () => {
      cy.createEditor({
        tools: {
          header: {
            class: Header,
            inlineToolbar: ['bold', 'testTool', 'link'],

          },
          testTool: {
            class: class {
              public static isInline = true;
              // eslint-disable-next-line jsdoc/require-jsdoc
              public render(): MenuConfig {
                return {
                  icon: 'n',
                  title: 'Test Tool',
                  name: 'test-tool',
                  children: {
                    items: [
                      {
                        icon: 'm',
                        title: 'Test Tool Item',
                        // eslint-disable-next-line  @typescript-eslint/no-empty-function
                        onActivate: () => {},
                      },
                    ],
                  },
                };
              }
            },
          },
        },
        data: {
          blocks: [
            {
              type: 'header',
              data: {
                text: 'First block text',
              },
            },
          ],
        },
      });

      /** Open Inline Toolbar */
      cy.get('[data-cy=editorjs]')
        .find('.ce-header')
        .selectText('block');

      /** Check that item with children is surrounded by separators */
      cy.get('[data-cy=editorjs]')
        .get('[data-cy=inline-toolbar] .ce-popover__items')
        .children()
        .eq(3)
        .should('have.class', 'ce-popover-item-separator');

      cy.get('[data-cy=editorjs]')
        .get('[data-cy=inline-toolbar] .ce-popover__items')
        .children()
        .eq(4)
        .should('have.attr', 'data-item-name', 'test-tool');

      cy.get('[data-cy=editorjs]')
        .get('[data-cy=inline-toolbar] .ce-popover__items')
        .children()
        .eq(5)
        .should('have.class', 'ce-popover-item-separator');
    });

    it('should have separator before the item with children if it is the last of all items', () => {
      cy.createEditor({
        tools: {
          header: {
            class: Header,
            inlineToolbar: ['bold', 'testTool'],

          },
          testTool: {
            class: class {
              public static isInline = true;
              // eslint-disable-next-line jsdoc/require-jsdoc
              public render(): MenuConfig {
                return {
                  icon: 'n',
                  title: 'Test Tool',
                  name: 'test-tool',
                  children: {
                    items: [
                      {
                        icon: 'm',
                        title: 'Test Tool Item',
                        // eslint-disable-next-line  @typescript-eslint/no-empty-function
                        onActivate: () => {},
                      },
                    ],
                  },
                };
              }
            },
          },
        },
        data: {
          blocks: [
            {
              type: 'header',
              data: {
                text: 'First block text',
              },
            },
          ],
        },
      });

      /** Open Inline Toolbar */
      cy.get('[data-cy=editorjs]')
        .find('.ce-header')
        .selectText('block');

      /** Check that item with children is surrounded by separators */
      cy.get('[data-cy=editorjs]')
        .get('[data-cy=inline-toolbar] .ce-popover__items')
        .children()
        .eq(3)
        .should('have.class', 'ce-popover-item-separator');

      cy.get('[data-cy=editorjs]')
        .get('[data-cy=inline-toolbar] .ce-popover__items')
        .children()
        .eq(4)
        .should('have.attr', 'data-item-name', 'test-tool');
    });
  });

  describe('Shortcuts', () => {
    it('should activate the focused editor\'s tool when shortcut is pressed with multiple instances on the page', () => {
      const toolActivated1 = cy.stub().as('toolActivated1');
      const toolActivated2 = cy.stub().as('toolActivated2');

      /* eslint-disable jsdoc/require-jsdoc */
      class Marker1 implements InlineTool {
        public static isInline = true;
        public static shortcut = 'CMD+SHIFT+M';
        public render(): MenuConfig {
          return {
            icon: 'm',
            title: 'Marker',
            onActivate: () => { toolActivated1(); },
          };
        }
      }
      class Marker2 implements InlineTool {
        public static isInline = true;
        public static shortcut = 'CMD+SHIFT+M';
        public render(): MenuConfig {
          return {
            icon: 'm',
            title: 'Marker',
            onActivate: () => { toolActivated2(); },
          };
        }
      }
      /* eslint-enable jsdoc/require-jsdoc */

      /** Create first editor */
      cy.createEditor({
        data: {
          blocks: [ { type: 'paragraph', data: { text: 'First editor text' } } ],
        },
        tools: { marker: Marker1 },
      });

      /** Create second editor with a different holder; keep a reference for the API call below */
      let editor2Ref: any;

      cy.window().then((win) => {
        const holder = win.document.createElement('div');

        holder.id = 'editorjs2';
        holder.dataset.cy = 'editorjs2';
        win.document.body.appendChild(holder);

        return new Promise<void>((resolve) => {
          editor2Ref = new win.EditorJS({
            holder: 'editorjs2',
            data: {
              blocks: [ { type: 'paragraph', data: { text: 'Second editor text' } } ],
            },
            tools: { marker: Marker2 },
          });

          editor2Ref.isReady.then(() => resolve());
        });
      });

      /**
       * Freeze the browser clock after both editors are ready.
       * This gives us deterministic control over the selectionchange debounce (180 ms).
       */
      cy.clock();

      /** Select text in editor 1 to open its inline toolbar and register its CMD+SHIFT+M shortcut */
      cy.get('[data-cy=editorjs]')
        .find('.ce-paragraph')
        .selectText('First');

      /**
       * Advance past the selectionchange debounce.
       * Editor 1's toolbar is now open and its CMD+SHIFT+M handler is registered on document.
       */
      cy.tick(200);

      cy.get('[data-cy=editorjs] [data-cy="inline-toolbar"] .ce-popover__container')
        .should('be.visible');

      /**
       * Select text in editor 2.  The selectionchange debounce is queued but the clock is still
       * frozen, so editor 1's CMD+SHIFT+M handler has NOT been removed yet — it is still live
       * on document.
       */
      cy.get('[data-cy=editorjs2]')
        .find('.ce-paragraph')
        .selectText('Second');

      /**
       * Open editor 2's inline toolbar programmatically BEFORE the pending debounce fires.
       * Because the selection is in editor 2, allowedToShow() returns true.
       * enableShortcuts() then tries to register CMD+SHIFT+M while editor 1's handler is still
       * present — a simultaneous duplicate-registration.
       *
       * Without the shortcuts.ts fix (which removed the throw on duplicate): this throws and is
       * silently swallowed by the try/catch in getPopoverItems(), leaving editor 2 with no
       * shortcut handler at all.
       * With the fix: both handlers are registered; each guards with `if (!currentBlock) return`
       * so only the focused editor's handler actually does anything.
       */
      cy.window().then(() => {
        editor2Ref.inlineToolbar.open();
      });

      /**
       * Advance past the pending debounces:
       * - Editor 1's selectionchange handler calls close(), which removes its shortcut via
       *   Shortcuts.remove(document, …) — this is the inline.ts fix; before the fix it called
       *   remove(redactor, …) which was a no-op, so editor 1's shortcut would have remained.
       * - Editor 2's selectionchange handler calls tryToShow(true), re-opening its toolbar cleanly.
       */
      cy.tick(200);

      /** Wait for editor 2's toolbar to be visible */
      cy.get('[data-cy=editorjs2] [data-cy="inline-toolbar"] .ce-popover__container')
        .should('be.visible');

      cy.document().then((doc) => {
        doc.dispatchEvent(new KeyboardEvent('keydown', {
          bubbles: true,
          cancelable: true,
          key: 'M',
          code: 'KeyM',
          keyCode: 77,
          which: 77,
          metaKey: true,
          shiftKey: true,
        }));
      });

      /** Second editor's shortcut should fire, first editor's should not */
      cy.get('@toolActivated2').should('have.been.called');
      cy.get('@toolActivated1').should('not.have.been.called');
    });

    it('should work in read-only mode', () => {
      const toolSurround = cy.stub().as('toolSurround');

      /* eslint-disable jsdoc/require-jsdoc */
      class Marker implements InlineTool {
        public static isInline = true;
        public static shortcut = 'CMD+SHIFT+M';
        public static isReadOnlySupported = true;
        public render(): MenuConfig {
          return {
            icon: 'm',
            title: 'Marker',
            onActivate: () => {
              toolSurround();
            },
          };
        }
      }
      /* eslint-enable jsdoc/require-jsdoc */

      createEditorWithTextBlocks([
        'some text',
      ], {
        tools: {
          marker: Marker,
        },
        readOnly: true,
      });

      cy.get('[data-cy=editorjs]')
        .find('.ce-paragraph')
        .selectText('text');

      cy.wait(300);

      cy.document().then((doc) => {
        doc.dispatchEvent(new KeyboardEvent('keydown', {
          bubbles: true,
          cancelable: true,
          key: 'M',
          code: 'KeyM',
          keyCode: 77,
          which: 77,
          metaKey: true,
          shiftKey: true,
        }));
      });

      cy.get('@toolSurround').should('have.been.called');
    });
  });
});

