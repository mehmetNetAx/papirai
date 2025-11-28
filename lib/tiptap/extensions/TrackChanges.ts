import { Mark, mergeAttributes } from '@tiptap/core';
import { Plugin, PluginKey } from '@tiptap/pm/state';

export interface TrackChangesOptions {
  HTMLAttributes: Record<string, any>;
  userId: string;
  userName: string;
  userColor: string;
  enabled?: boolean;
  onTrackChange?: (change: {
    type: 'insertion' | 'deletion';
    position: number;
    length: number;
    content: string;
    originalContent?: string;
  }) => void;
}

declare module '@tiptap/core' {
  interface Commands<ReturnType> {
    trackChanges: {
      /**
       * Set a track change mark
       */
      setTrackChange: (attributes: {
        type: 'insertion' | 'deletion';
        userId: string;
        userName: string;
        userColor: string;
        timestamp: Date;
      }) => ReturnType;
      /**
       * Remove track change marks
       */
      removeTrackChange: () => ReturnType;
      /**
       * Accept all changes
       */
      acceptAllChanges: () => ReturnType;
      /**
       * Reject all changes
       */
      rejectAllChanges: () => ReturnType;
      /**
       * Accept a specific track change
       */
      acceptTrackChange: (attributes?: { position?: number; length?: number; type?: 'insertion' | 'deletion'; content?: string }) => ReturnType;
      /**
       * Reject a specific track change
       */
      rejectTrackChange: (attributes?: { position?: number; length?: number; type?: 'insertion' | 'deletion'; content?: string }) => ReturnType;
    };
  }
}

export const TrackChanges = Mark.create<TrackChangesOptions>({
  name: 'trackChange',

  addOptions() {
    return {
      HTMLAttributes: {},
      userId: '',
      userName: '',
      userColor: '#3b82f6',
      onTrackChange: undefined,
      enabled: true,
    };
  },

  addProseMirrorPlugins() {
    const extension = this;
    let pendingChanges: Array<{
      type: 'insertion' | 'deletion';
      from: number;
      to: number;
      content: string;
      originalContent?: string;
    }> = [];
    let debounceTimer: ReturnType<typeof setTimeout> | null = null;
    let editorView: any = null;
    let lastDocumentState: any = null;
    let initialDocumentState: any = null; // Store the state when we start collecting changes
    let isInitialLoad = true; // Track if we're still in initial load phase

    const processPendingChanges = () => {
      if (!extension.options.enabled || !extension.options.onTrackChange || !editorView) {
        return;
      }

      if (pendingChanges.length === 0 || !lastDocumentState) {
        return;
      }

      // Make a copy of pendingChanges to process, then clear immediately to prevent duplicate processing
      const changesToProcess = [...pendingChanges];
      pendingChanges = [];

      const currentState = editorView.state;
      const originalState = lastDocumentState.oldState;
      const schema = currentState.schema;
      const trackChangeMarkType = schema.marks[extension.name];
      if (!trackChangeMarkType) {
        return;
      }

      // Separate insertions and deletions (use the copy we made)
      // IMPORTANT: Process deletions first to remove any insertions that were later deleted
      // This prevents "mson" type issues where a character was inserted then deleted
      const deletions = changesToProcess.filter(c => c.type === 'deletion');
      const insertions = changesToProcess.filter(c => c.type === 'insertion');
      
      // Remove insertions that were later deleted
      // For each deletion, remove any insertions that overlap with it
      const filteredInsertions = insertions.filter(insertion => {
        return !deletions.some(deletion => {
          // Check if deletion overlaps with or removes this insertion
          // If deletion's range overlaps with insertion's range, exclude the insertion
          return deletion.from <= insertion.to && deletion.to >= insertion.from;
        });
      });

      const tr = currentState.tr;
      let modified = false;

      // Process all insertions as a SINGLE combined insertion
      if (filteredInsertions.length > 0) {
        // Sort insertions by their original position (in the initial document)
        const sortedInsertions = [...filteredInsertions].sort((a, b) => a.from - b.from);
        
        // Find the first insertion position (in original document coordinates)
        const firstInsertion = sortedInsertions[0];
        
        // Calculate total inserted text by concatenating all insertions in order
        // We need to account for position shifts: each insertion shifts subsequent positions
        // IMPORTANT: Only concatenate if insertions are truly consecutive (no gaps)
        let allInsertedText = '';
        let lastEndPos = firstInsertion.from;
        
        sortedInsertions.forEach((change) => {
          // Check if this insertion is consecutive with the previous one
          // For consecutive typing, each insertion should start where the previous one ended
          // (or very close, accounting for small rounding differences)
          const isConsecutive = change.from <= lastEndPos + 1; // Allow 1 char difference for rounding
          
          if (isConsecutive) {
            // Consecutive - concatenate
            allInsertedText += change.content;
            lastEndPos = Math.max(lastEndPos, change.to);
          } else {
            // There's a gap - this means the user typed in a different location
            // For now, we'll still concatenate but log a warning
            console.warn('TrackChanges: Non-consecutive insertions detected', {
              gap: change.from - lastEndPos,
              lastEnd: lastEndPos,
              currentFrom: change.from
            });
            allInsertedText += change.content;
            lastEndPos = change.to;
          }
        });

        // The start position is the first insertion's original position
        const insertionStart = firstInsertion.from;
        
        // The end position: start + total length of all insertions
        // Since we concatenated all text, the end is simply start + length
        const insertionEnd = insertionStart + allInsertedText.length;

        // Create a single mark for all insertions
        const mark = trackChangeMarkType.create({
          type: 'insertion',
          userId: extension.options.userId,
          userName: extension.options.userName,
          userColor: extension.options.userColor,
          timestamp: new Date().toISOString(),
          accepted: false,
          rejected: false,
        });

        // Only add mark if the range is valid in current document
        const currentDocSize = currentState.doc.content.size;
        if (insertionEnd > insertionStart && insertionStart < currentDocSize) {
          const actualEnd = Math.min(insertionEnd, currentDocSize);
          tr.addMark(insertionStart, actualEnd, mark);
          modified = true;
        }

        // Single callback for ALL insertions combined - only once!
        if (allInsertedText.length > 0) {
          console.log('TrackChanges: Processing', filteredInsertions.length, 'insertions as one change:', JSON.stringify(allInsertedText));
          extension.options.onTrackChange?.({
            type: 'insertion',
            position: insertionStart,
            length: allInsertedText.length,
            content: allInsertedText,
          });
        }
      }

      // Process deletions - group consecutive deletions like we do for insertions
      if (deletions.length > 0) {
        // Sort deletions by their original position
        const sortedDeletions = [...deletions].sort((a, b) => a.from - b.from);
        
        // Group consecutive deletions
        const deletionGroups: Array<{
          from: number;
          to: number;
          originalContent: string;
        }> = [];
        
        sortedDeletions.forEach((change) => {
          const lastGroup = deletionGroups[deletionGroups.length - 1];
          
          // Check if this deletion is consecutive with the last group
          // Consecutive deletions are those that are adjacent or overlapping
          if (lastGroup && change.from <= lastGroup.to) {
            // Merge with last group
            lastGroup.to = Math.max(lastGroup.to, change.to);
            lastGroup.originalContent += (change.originalContent || '');
          } else {
            // Start a new group
            deletionGroups.push({
              from: change.from,
              to: change.to,
              originalContent: change.originalContent || '',
            });
          }
        });
        
        // Process each deletion group
        // IMPORTANT: We need to insert the deleted text back with a deletion mark
        // This is how Word works - deleted text is still visible but strikethrough
        // Process deletions in reverse order to maintain correct positions
        const reversedGroups = [...deletionGroups].reverse();
        
        reversedGroups.forEach((group) => {
          try {
            if (group.originalContent.length === 0) {
              return; // Skip empty deletions
            }

            // Check if this deletion has already been processed (to prevent duplicates)
            // We check if there's already a deletion mark at this position
            const deletionPos = Math.min(group.from, currentState.doc.content.size);
            const nodeAtPos = currentState.doc.nodeAt(deletionPos);
            if (nodeAtPos) {
              const existingMark = nodeAtPos.marks.find((m: any) => 
                m.type === trackChangeMarkType && m.attrs.type === 'deletion'
              );
              if (existingMark) {
                // Already processed, skip to prevent duplicates
                console.log('TrackChanges: Deletion already processed, skipping');
                return;
              }
            }

            const mark = trackChangeMarkType.create({
              type: 'deletion',
              userId: extension.options.userId,
              userName: extension.options.userName,
              userColor: extension.options.userColor,
              timestamp: new Date().toISOString(),
              accepted: false,
              rejected: false,
            });

            // Calculate the position in the current document where deletion occurred
            // Use the original position from the initial document state
            // IMPORTANT: Since we're processing in reverse order, positions might have shifted
            // due to previous insertions. We need to use the current document size to ensure
            // we don't insert beyond the document bounds.
            const safeDeletionPos = Math.min(Math.max(0, deletionPos), currentState.doc.content.size);
            
            // Insert the deleted text back at the deletion position
            // Then apply the deletion mark to make it visible with strikethrough (like Word)
            const textNode = currentState.schema.text(group.originalContent);
            tr.insert(safeDeletionPos, textNode);
            
            // Apply the deletion mark to the inserted text
            // IMPORTANT: After insert, positions are updated, so we need to recalculate
            const markStart = safeDeletionPos;
            const markEnd = safeDeletionPos + group.originalContent.length;
            
            // Verify mark attributes before applying
            console.log('TrackChanges: Applying deletion mark:', {
              type: mark.attrs.type,
              from: markStart,
              to: markEnd,
              text: group.originalContent.substring(0, 20),
            });
            
            tr.addMark(markStart, markEnd, mark);
            modified = true;

            // Single callback for this deletion group
            console.log('TrackChanges: Processing deletion group:', JSON.stringify(group.originalContent));
            extension.options.onTrackChange?.({
              type: 'deletion',
              position: group.from,
              length: group.to - group.from,
              content: '',
              originalContent: group.originalContent,
            });
          } catch (error) {
            console.debug('Track changes error:', error);
          }
        });
      }

      // Clear document state (pendingChanges already cleared above)
      lastDocumentState = null;
      initialDocumentState = null;

      // Dispatch transaction if there were changes
      // IMPORTANT: Mark this transaction so we don't track it again (prevent infinite loop)
      if (modified) {
        tr.setMeta('trackChanges', 'internal'); // Mark as internal to prevent re-tracking
        editorView.dispatch(tr);
      }
    };

    return [
      new Plugin({
        key: new PluginKey('trackChanges'),
        appendTransaction(transactions, oldState, newState) {
          // Only track if enabled
          if (!extension.options.enabled || !extension.options.onTrackChange) {
            return null;
          }

          // Check if document changed
          if (!transactions.some(tr => tr.docChanged)) {
            return null;
          }

          // IMPORTANT: Skip tracking during initial content load
          // Multiple checks to detect initial load:
          // 1. Empty document becoming non-empty
          // 2. Large content change (likely initial load)
          // 3. Transaction metadata indicating setContent
          const isEmptyToNonEmpty = oldState.doc.content.size <= 1 && newState.doc.content.size > 10;
          const isLargeChange = Math.abs(newState.doc.content.size - oldState.doc.content.size) > 100;
          const isSetContent = transactions.some(tr => 
            tr.getMeta('preventUpdate') || 
            tr.getMeta('paste') || 
            tr.getMeta('uiEvent') === 'paste' ||
            tr.getMeta('addToHistory') === false // setContent often has this
          );

          if (isSetContent || isInitialLoad || isEmptyToNonEmpty || (isLargeChange && isInitialLoad)) {
            // This is initial content load, set initial state but don't track changes
            if (!initialDocumentState) {
              initialDocumentState = newState; // Use newState as baseline after load
              isInitialLoad = false; // Mark initial load as complete
              // Clear any pending changes from initial load
              pendingChanges = [];
              lastDocumentState = null;
            }
            return null; // Don't track initial load as changes
          }

          // Store the initial document state when we start collecting changes (after initial load)
          if (!initialDocumentState) {
            initialDocumentState = oldState;
            isInitialLoad = false;
          }

          // Store the document state for later processing
          lastDocumentState = {
            oldState: initialDocumentState, // Always use the initial state as reference
            newState,
          };

          // Collect changes without marking immediately
          // IMPORTANT: Skip transactions that we created ourselves (marked with 'trackChanges' metadata)
          transactions.forEach((transaction) => {
            // Skip our own internal transactions to prevent infinite loops
            if (transaction.getMeta('trackChanges') === 'internal') {
              return;
            }
            if (!transaction.docChanged) return;

            transaction.steps.forEach((step: any) => {
              try {
                if (step.from !== undefined && step.to !== undefined) {
                  const from = step.from;
                  const to = step.to;
                  const slice = step.slice;

                  // Check if this is a deletion
                  if (to > from && (!slice || slice.size === 0)) {
                    const deletedText = oldState.doc.textBetween(from, to);
                    // Include all deleted text including spaces (don't filter out spaces)
                    if (deletedText.length > 0) {
                      pendingChanges.push({
                        type: 'deletion',
                        from,
                        to,
                        content: '',
                        originalContent: deletedText,
                      });
                    }
                  }
                }

                // Handle insertions
                if (step.slice && step.from !== undefined) {
                  const slice = step.slice;
                  if (slice.content && slice.content.size > 0) {
                    const from = step.from;
                    const to = from + slice.size;
                    const insertedText = slice.content.textBetween(0, slice.content.size);
                    
                    // Include all text including spaces (don't filter out spaces)
                    if (insertedText.length > 0) {
                      pendingChanges.push({
                        type: 'insertion',
                        from,
                        to,
                        content: insertedText,
                      });
                    }
                  }
                }
              } catch (error) {
                console.debug('Track changes error:', error);
              }
            });
          });

          // Clear existing timer
          if (debounceTimer) {
            clearTimeout(debounceTimer);
            debounceTimer = null;
          }

          // Set debounce timer (1.5 seconds) - only process after user stops typing
          debounceTimer = setTimeout(() => {
            processPendingChanges();
          }, 1500);

          return null; // Don't apply anything immediately
        },
        props: {
          handleKeyDown(view, event) {
            // Process immediately on Enter
            if (event.key === 'Enter') {
              if (debounceTimer) {
                clearTimeout(debounceTimer);
                debounceTimer = null;
              }
              processPendingChanges();
            }
            return false;
          },
        },
        view(view) {
          editorView = view;
          
          // Reset initial load flag when view is created
          // This ensures that if editor is recreated, we don't track initial content
          isInitialLoad = true;
          initialDocumentState = null;
          lastDocumentState = null;
          pendingChanges = [];
          
          // IMPORTANT: Remove all existing track change marks from initial content
          // This prevents any track change marks in the HTML from being displayed
          const { state } = view;
          const { schema } = state;
          const trackChangeMarkType = schema.marks[extension.name];
          
          if (trackChangeMarkType) {
            // Create a transaction to remove all track change marks
            const tr = state.tr;
            let modified = false;
            
            state.doc.descendants((node, pos) => {
              if (node.marks) {
                const trackChangeMark = node.marks.find(m => m.type === trackChangeMarkType);
                if (trackChangeMark) {
                  // Remove the mark from this node
                  tr.removeMark(pos, pos + node.nodeSize, trackChangeMarkType);
                  modified = true;
                }
              }
            });
            
            if (modified) {
              // Mark as internal to prevent re-tracking
              tr.setMeta('trackChanges', 'internal');
              // Use setTimeout to ensure this runs after initial render
              setTimeout(() => {
                view.dispatch(tr);
              }, 0);
            }
          }

          const handleBlur = () => {
            // Process immediately on blur
            if (debounceTimer) {
              clearTimeout(debounceTimer);
              debounceTimer = null;
            }
            processPendingChanges();
          };

          // Listen to blur events
          view.dom.addEventListener('blur', handleBlur, true);

          return {
            destroy() {
              // Process any pending changes when editor is destroyed
              if (debounceTimer) {
                clearTimeout(debounceTimer);
                debounceTimer = null;
              }
              processPendingChanges();
              view.dom.removeEventListener('blur', handleBlur, true);
              editorView = null;
              isInitialLoad = true; // Reset for next time
            },
          };
        },
      }),
    ];
  },

  addAttributes() {
    return {
      type: {
        default: 'insertion',
        parseHTML: (element) => element.getAttribute('data-change-type'),
        renderHTML: (attributes) => {
          if (!attributes.type) {
            return {};
          }
          return {
            'data-change-type': attributes.type,
          };
        },
      },
      userId: {
        default: null,
        parseHTML: (element) => element.getAttribute('data-user-id'),
        renderHTML: (attributes) => {
          if (!attributes.userId) {
            return {};
          }
          return {
            'data-user-id': attributes.userId,
          };
        },
      },
      userName: {
        default: null,
        parseHTML: (element) => element.getAttribute('data-user-name'),
        renderHTML: (attributes) => {
          if (!attributes.userName) {
            return {};
          }
          return {
            'data-user-name': attributes.userName,
          };
        },
      },
      userColor: {
        default: '#3b82f6',
        parseHTML: (element) => element.getAttribute('data-user-color'),
        renderHTML: (attributes) => {
          if (!attributes.userColor) {
            return {};
          }
          return {
            'data-user-color': attributes.userColor,
          };
        },
      },
      timestamp: {
        default: null,
        parseHTML: (element) => element.getAttribute('data-timestamp'),
        renderHTML: (attributes) => {
          if (!attributes.timestamp) {
            return {};
          }
          return {
            'data-timestamp': attributes.timestamp,
          };
        },
      },
      accepted: {
        default: false,
        parseHTML: (element) => element.getAttribute('data-accepted') === 'true',
        renderHTML: (attributes) => {
          if (!attributes.accepted) {
            return {};
          }
          return {
            'data-accepted': 'true',
          };
        },
      },
      rejected: {
        default: false,
        parseHTML: (element) => element.getAttribute('data-rejected') === 'true',
        renderHTML: (attributes) => {
          if (!attributes.rejected) {
            return {};
          }
          return {
            'data-rejected': 'true',
          };
        },
      },
    };
  },

  parseHTML() {
    // IMPORTANT: Don't parse track changes from HTML at all
    // This prevents any existing track change marks in initial content from being parsed
    // Track changes should only be created through the plugin, not from HTML
    return [];
    
    // OLD CODE (commented out to prevent parsing):
    // Only parse track changes if extension is enabled
    // This prevents parsing marks from initial content when track changes is disabled
    // if (!this.options.enabled) {
    //   return []; // Don't parse anything if track changes is disabled
    // }
    // 
    // return [
    //   {
    //     tag: 'span[data-change-type]',
    //     getAttrs: (element) => {
    //       // Only parse if data-change-type attribute exists and is valid
    //       if (typeof element === 'string') return false;
    //       const changeType = (element as HTMLElement).getAttribute('data-change-type');
    //       if (!changeType || (changeType !== 'insertion' && changeType !== 'deletion')) {
    //         return false; // Don't parse if attribute is missing or invalid
    //       }
    //       return {};
    //     },
    //   },
    // ];
  },

  renderHTML({ HTMLAttributes, mark }): any {
    // Get type from mark attributes (fallback to HTMLAttributes for compatibility)
    const type = mark?.attrs?.type || HTMLAttributes?.type;
    
    // IMPORTANT: Only render if type is explicitly set (insertion or deletion)
    // This prevents rendering marks on content that doesn't have track changes
    if (!type || (type !== 'insertion' && type !== 'deletion')) {
      // Return false to skip rendering this mark
      return false;
    }
    
    const accepted = mark?.attrs?.accepted || HTMLAttributes?.accepted || false;
    const rejected = mark?.attrs?.rejected || HTMLAttributes?.rejected || false;
    
    // Word-like styling: red color for both insertions and deletions
    let style = '';
    if (type === 'insertion') {
      // Insertions: red text with underline (like Word)
      style = 'color: #dc2626; text-decoration: underline; text-decoration-color: #dc2626; background-color: transparent;';
    } else if (type === 'deletion') {
      // Deletions: red text with strikethrough (like Word)
      style = 'color: #dc2626; text-decoration: line-through; text-decoration-color: #dc2626; background-color: transparent;';
    }
    
    if (accepted) {
      style += ' opacity: 0.5;';
    }
    if (rejected) {
      style += ' display: none;';
    }

    return [
      'span',
      mergeAttributes(this.options.HTMLAttributes, HTMLAttributes, {
        style,
        class: 'track-change',
      }),
      0,
    ];
  },

  addCommands() {
    return {
      setTrackChange:
        (attributes) =>
        ({ commands }) => {
          return commands.setMark(this.name, {
            type: attributes.type,
            userId: attributes.userId,
            userName: attributes.userName,
            userColor: attributes.userColor,
            timestamp: attributes.timestamp,
            accepted: false,
            rejected: false,
          });
        },
      removeTrackChange:
        () =>
        ({ commands }) => {
          return commands.unsetMark(this.name);
        },
      /**
       * Accept a track change (remove mark and keep content for insertions, remove content for deletions)
       */
      acceptTrackChange:
        (attributes?: { position?: number; length?: number; type?: 'insertion' | 'deletion'; content?: string }) =>
        ({ tr, state, dispatch }) => {
          if (!dispatch) return false;
          
          const trackChangeMarkType = state.schema.marks[this.name];
          if (!trackChangeMarkType) return false;
          
          let modified = false;
          const newTr = state.tr;
          
          // If position is provided, use it; otherwise search for the mark by content
          if (attributes?.position !== undefined && attributes?.length !== undefined) {
            const from = attributes.position;
            const to = attributes.position + attributes.length;
            
            // Find track change marks in the specified range
            state.doc.nodesBetween(from, to, (node, pos) => {
              if (node.marks) {
                node.marks.forEach((mark) => {
                  if (mark.type === trackChangeMarkType) {
                    const markType = mark.attrs.type;
                    const markFrom = Math.max(from, pos);
                    const markTo = Math.min(to, pos + node.nodeSize);
                    
                    if (markType === 'deletion') {
                      // For deletion: remove the mark and delete the text (accept deletion = remove text)
                      newTr.removeMark(markFrom, markTo, trackChangeMarkType);
                      newTr.delete(markFrom, markTo);
                      modified = true;
                    } else if (markType === 'insertion') {
                      // For insertion: remove the mark but keep the text (accept insertion = keep text as normal)
                      newTr.removeMark(markFrom, markTo, trackChangeMarkType);
                      modified = true;
                    }
                  }
                });
              }
            });
          } else {
            // Search entire document for matching mark by type and content
            const targetType = attributes?.type;
            const targetContent = attributes?.content;
            
            state.doc.descendants((node, pos) => {
              if (node.marks) {
                node.marks.forEach((mark) => {
                  if (mark.type === trackChangeMarkType) {
                    const markType = mark.attrs.type;
                    const nodeText = node.textContent || '';
                    
                    // Match by type and optionally by content
                    const typeMatches = !targetType || markType === targetType;
                    const contentMatches = !targetContent || nodeText.includes(targetContent.substring(0, 20));
                    
                    if (typeMatches && contentMatches) {
                      const markFrom = pos;
                      const markTo = pos + node.nodeSize;
                      
                      if (markType === 'deletion') {
                        // For deletion: remove the mark and delete the text
                        newTr.removeMark(markFrom, markTo, trackChangeMarkType);
                        newTr.delete(markFrom, markTo);
                        modified = true;
                      } else if (markType === 'insertion') {
                        // For insertion: remove the mark but keep the text
                        newTr.removeMark(markFrom, markTo, trackChangeMarkType);
                        modified = true;
                      }
                    }
                  }
                });
              }
            });
          }
          
          if (modified) {
            newTr.setMeta('trackChanges', 'internal');
            dispatch(newTr);
            return true;
          }
          
          return false;
        },
      /**
       * Reject a track change (remove mark and restore original: keep text for deletions, remove text for insertions)
       */
      rejectTrackChange:
        (attributes?: { position?: number; length?: number; type?: 'insertion' | 'deletion'; content?: string }) =>
        ({ tr, state, dispatch }) => {
          if (!dispatch) return false;
          
          const trackChangeMarkType = state.schema.marks[this.name];
          if (!trackChangeMarkType) return false;
          
          let modified = false;
          const newTr = state.tr;
          
          // If position is provided, use it; otherwise search for the mark by content
          if (attributes?.position !== undefined && attributes?.length !== undefined) {
            const from = attributes.position;
            const to = attributes.position + attributes.length;
            
            // Find track change marks in the specified range
            state.doc.nodesBetween(from, to, (node, pos) => {
              if (node.marks) {
                node.marks.forEach((mark) => {
                  if (mark.type === trackChangeMarkType) {
                    const markType = mark.attrs.type;
                    const markFrom = Math.max(from, pos);
                    const markTo = Math.min(to, pos + node.nodeSize);
                    
                    if (markType === 'deletion') {
                      // For deletion: remove the mark but keep the text (reject deletion = restore text)
                      newTr.removeMark(markFrom, markTo, trackChangeMarkType);
                      modified = true;
                    } else if (markType === 'insertion') {
                      // For insertion: remove the mark and delete the text (reject insertion = remove text)
                      newTr.removeMark(markFrom, markTo, trackChangeMarkType);
                      newTr.delete(markFrom, markTo);
                      modified = true;
                    }
                  }
                });
              }
            });
          } else {
            // Search entire document for matching mark by type and content
            const targetType = attributes?.type;
            const targetContent = attributes?.content;
            
            state.doc.descendants((node, pos) => {
              if (node.marks) {
                node.marks.forEach((mark) => {
                  if (mark.type === trackChangeMarkType) {
                    const markType = mark.attrs.type;
                    const nodeText = node.textContent || '';
                    
                    // Match by type and optionally by content
                    const typeMatches = !targetType || markType === targetType;
                    const contentMatches = !targetContent || nodeText.includes(targetContent.substring(0, 20));
                    
                    if (typeMatches && contentMatches) {
                      const markFrom = pos;
                      const markTo = pos + node.nodeSize;
                      
                      if (markType === 'deletion') {
                        // For deletion: remove the mark but keep the text
                        newTr.removeMark(markFrom, markTo, trackChangeMarkType);
                        modified = true;
                      } else if (markType === 'insertion') {
                        // For insertion: remove the mark and delete the text
                        newTr.removeMark(markFrom, markTo, trackChangeMarkType);
                        newTr.delete(markFrom, markTo);
                        modified = true;
                      }
                    }
                  }
                });
              }
            });
          }
          
          if (modified) {
            newTr.setMeta('trackChanges', 'internal');
            dispatch(newTr);
            return true;
          }
          
          return false;
        },
      acceptAllChanges:
        () =>
        ({ tr, state }) => {
          const { selection } = state;
          const { from, to } = selection;

          state.doc.nodesBetween(from, to, (node, pos) => {
            if (node.marks) {
              node.marks.forEach((mark) => {
                if (mark.type.name === this.name) {
                  const newAttrs = { ...mark.attrs, accepted: true };
                  tr.removeMark(pos, pos + node.nodeSize, mark.type);
                  tr.addMark(pos, pos + node.nodeSize, mark.type.create(newAttrs));
                }
              });
            }
          });

          return true;
        },
      rejectAllChanges:
        () =>
        ({ tr, state }) => {
          const { selection } = state;
          const { from, to } = selection;

          state.doc.nodesBetween(from, to, (node, pos) => {
            if (node.marks) {
              node.marks.forEach((mark) => {
                if (mark.type.name === this.name) {
                  const newAttrs = { ...mark.attrs, rejected: true };
                  tr.removeMark(pos, pos + node.nodeSize, mark.type);
                  tr.addMark(pos, pos + node.nodeSize, mark.type.create(newAttrs));
                }
              });
            }
          });

          return true;
        },
    };
  },
});

