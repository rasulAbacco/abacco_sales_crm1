import React, {
  useState,
  useEffect,
  useRef,
  forwardRef,
  useImperativeHandle,
} from "react";
import {
  ChevronDown,
  Minus,
  Plus,
  Bold,
  Italic,
  Underline,
  List,
  ListOrdered,
  ChevronLeft,
  ChevronRight,
  AlignLeft,
  AlignCenter,
  AlignRight,
  AlignJustify,
  Eraser,
} from "lucide-react";

// ==========================================
// ✅ CONSTANTS & COLOR PALETTES
// ==========================================
const OUTLOOK_THEME_COLORS = [
  ["#FFFFFF", "#F2F2F2", "#D6D6D6", "#BFBFBF", "#808080", "#404040"],
  ["#000000", "#262626", "#595959", "#7F7F7F", "#BFBFBF", "#D9D9D9"],
  ["#D9E1F2", "#B4C6E7", "#8EAADB", "#4472C4", "#2F5597", "#1F3864"],
  ["#FCE4D6", "#F8CBAD", "#F4B183", "#ED7D31", "#C55A11", "#843C0C"],
  ["#EDEDED", "#DBDBDB", "#C9C9C9", "#A5A5A5", "#7F7F7F", "#595959"],
  ["#FFF2CC", "#FFE699", "#FFD966", "#FFC000", "#BF9000", "#7F6000"],
  ["#DDEBF7", "#BDD7EE", "#9BC2E6", "#5B9BD5", "#2E75B6", "#1F4E79"],
  ["#E2EFDA", "#C6E0B4", "#A9D18E", "#70AD47", "#548235", "#375623"],
  ["#D9E2F3", "#B4C7E7", "#8EAADB", "#2F5597", "#1F3864", "#172B4D"],
  ["#E4DFEC", "#CFC7DC", "#B4A7D6", "#8E7CC3", "#5F497A", "#3F3151"],
];

const OUTLOOK_STANDARD_COLORS = [
  "#C00000",
  "#FF0000",
  "#FFC000",
  "#FFFF00",
  "#92D050",
  "#00B050",
  "#00B0F0",
  "#002060",
  "#7030A0",
];

const OUTLOOK_HIGHLIGHT_COLORS = [
  "#FFFF00",
  "#00FF00",
  "#00FFFF",
  "#FF00FF",
  "#0000FF",
  "#FF0000",
  "#000080",
  "#008000",
  "#800080",
  "#800000",
  "#808000",
  "#808080",
  "#C0C0C0",
  "#000000",
];

const OutlookEditor = forwardRef(({ initialContent, placeholder }, ref) => {
  const editorRef = useRef(null);
  const moreColorRef = useRef(null);

  // States
  const [showFontColors, setShowFontColors] = useState(false);
  const [showHighlightColors, setShowHighlightColors] = useState(false);
  const [fontFamily, setFontFamily] = useState("Calibri");
  const [fontSizeValue, setFontSizeValue] = useState("11");
  const [lineSpacingValue, setLineSpacingValue] = useState("1.15");

  // ==========================================
  // ✅ EFFECTS & INITIALIZATION
  // ==========================================

  useEffect(() => {
    // We set the default separator to 'div' to allow single line breaks via BR easily
    document.execCommand("defaultParagraphSeparator", false, "div");
  }, []);

  useEffect(() => {
    if (editorRef.current && initialContent) {
      editorRef.current.innerHTML = initialContent;
      normalizeParagraphs(editorRef.current);
    }
  }, [initialContent]);

  // Handle clicking outside color pickers
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (!e.target.closest(".font-color-wrapper")) setShowFontColors(false);
      if (!e.target.closest(".highlight-color-wrapper"))
        setShowHighlightColors(false);
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  useImperativeHandle(ref, () => ({
    getHtml: () => editorRef.current?.innerHTML || "",
    setHtml: (html) => {
      if (editorRef.current) {
        editorRef.current.innerHTML = html;
        normalizeParagraphs(editorRef.current);
        editorRef.current.focus();
      }
    },
    clear: () => {
      if (editorRef.current) {
        editorRef.current.innerHTML = "";
      }
    },
  }));

  // ==========================================
  // ✅ CORE LOGIC: KEYS & PASTE
  // ==========================================

  const normalizeParagraphs = (root) => {
    if (!root) return;
    const paragraphs = root.querySelectorAll("p");
    paragraphs.forEach((p) => {
      // Ensure pasted or existing P tags have the spacing
      if (!p.style.marginBottom) {
        p.style.marginBottom = "12px";
        p.style.marginTop = "0";
      }
    });
  };

  const handleKeyDown = (e) => {
    if (e.key === "Enter") {
      if (e.shiftKey) {
        // Shift+Enter: Just a line break
        return;
      } else {
        // ✅ LOGIC: Enter = Next Line (Single <br>) with NO space.
        // To ensure the cursor moves to a new line correctly, we insert a BR.
        // We do NOT insert margins here.

        e.preventDefault();

        // Insert a standard BR.
        // We add a zero-width space after to ensure the browser renders the line correctly
        // if it is the last element in the container.
        document.execCommand("insertHTML", false, "<br>&#8203;");
      }
    }
  };

  const handlePaste = (e) => {
    e.preventDefault();
    const htmlData = e.clipboardData.getData("text/html");
    const textData = e.clipboardData.getData("text/plain");

    if (htmlData) {
      // 1. Sanitize
      const cleanHtml = htmlData.replace(
        /<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi,
        "",
      );

      // 2. Paste as is to preserve format
      document.execCommand("insertHTML", false, cleanHtml);
    } else {
      // Plain text paste: treat newlines as breaks to match current editor mode
      const normHtml = textData.replace(/\n/g, "<br>");
      document.execCommand("insertHTML", false, normHtml);
    }

    // Post-paste: Ensure any P tags that came in have the margin
    setTimeout(() => {
      normalizeParagraphs(editorRef.current);
    }, 50);
  };

  // ==========================================
  // ✅ FORMATTING COMMANDS
  // ==========================================

  const exec = (command, value = null) => {
    document.execCommand(command, false, value);
    editorRef.current?.focus();
  };

  const handleFontFamily = (e) => {
    const val = e.target.value;
    setFontFamily(val);
    exec("fontName", val);
  };

  const applyFontSize = () => {
    const sizeStr = fontSizeValue + "pt";
    const selection = window.getSelection();
    if (!selection.rangeCount) return;
    if (selection.isCollapsed) {
      const span = `<span style="font-size: ${sizeStr}">&nbsp;</span>`;
      document.execCommand("insertHTML", false, span);
    } else {
      applyStyleToSelectionNodes("fontSize", sizeStr);
    }
  };

  const applyStyleToSelectionNodes = (styleProp, value) => {
    const selection = window.getSelection();
    if (!selection.rangeCount) return;
    const range = selection.getRangeAt(0);
    const tempDiv = document.createElement("div");
    tempDiv.appendChild(range.cloneContents());

    const processNodes = (parentNode) => {
      Array.from(parentNode.childNodes).forEach((child) => {
        if (child.nodeType === Node.TEXT_NODE) {
          const span = document.createElement("span");
          span.style[styleProp] = value;
          span.textContent = child.textContent;
          parentNode.replaceChild(span, child);
        } else if (child.nodeType === Node.ELEMENT_NODE) {
          processNodes(child);
        }
      });
    };

    processNodes(tempDiv);
    document.execCommand("insertHTML", false, tempDiv.innerHTML);
  };

  const adjustFontSize = (delta) => {
    let current = parseFloat(fontSizeValue) || 11;
    let newSize = parseFloat((current + delta).toFixed(1));
    if (newSize < 1) newSize = 1;
    setFontSizeValue(newSize.toString());
    const sizeStr = newSize + "pt";
    applyStyleToSelectionNodes("fontSize", sizeStr);
  };

  const applyLineSpacing = () => {
    const val = parseFloat(lineSpacingValue) || 1.15;
    const blocks = editorRef.current.querySelectorAll("p, div");

    blocks.forEach((block) => {
      block.style.lineHeight = val.toString();
      if (val > 1.5) block.style.marginBottom = "16px";
      else if (val < 1.0) block.style.marginBottom = "4px";
      else block.style.marginBottom = "12px";
    });
  };

  const clearFormattingAndNormalize = () => {
    document.execCommand("removeFormat");
    const blocks = editorRef.current.querySelectorAll("p, div");
    blocks.forEach((el) => {
      el.style.fontFamily = "Calibri";
      el.style.fontSize = "11pt";
      el.style.lineHeight = "1.15";
      el.style.color = "#000000";
      el.style.marginBottom = "12px";
    });
  };

  return (
    <div className="border border-gray-300 rounded-lg overflow-hidden focus-within:ring-2 focus-within:ring-blue-500 focus-within:border-blue-500 bg-white flex flex-col">
      {/* Toolbar */}
      <div className="flex flex-wrap items-center gap-2 p-2 bg-gray-50 border-b border-gray-300 select-none">
        {/* Font Family */}
        <div className="flex items-center border-r border-gray-300 pr-2">
          <div className="relative">
            <select
              value={fontFamily}
              onChange={handleFontFamily}
              className="appearance-none bg-transparent border border-gray-300 rounded px-2 py-1 text-xs w-32 cursor-pointer hover:bg-white hover:border-blue-400 focus:outline-none"
            >
              <option value="Calibri">Calibri</option>
              <option value="Arial">Arial</option>
              <option value="Times New Roman">Times New Roman</option>
              <option value="Georgia">Georgia</option>
              <option value="Verdana">Verdana</option>
              <option value="Tahoma">Tahoma</option>
              <option value="Courier New">Courier New</option>
            </select>
            <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 pointer-events-none text-gray-500 w-3 h-3" />
          </div>
        </div>

        {/* Font Size */}
        <div className="flex items-center border-r border-gray-300 pr-2 gap-1">
          <button
            onClick={() => adjustFontSize(-0.5)}
            className="p-1 hover:bg-gray-200 rounded"
          >
            <Minus className="w-3 h-3" />
          </button>
          <div className="flex items-center border border-gray-300 rounded bg-white">
            <input
              type="number"
              min="1"
              step="0.5"
              value={fontSizeValue}
              onChange={(e) => setFontSizeValue(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && applyFontSize()}
              className="w-10 text-center text-xs p-0.5 focus:outline-none"
            />
            <span className="text-xs text-gray-500 pr-1">pt</span>
            <button
              onClick={applyFontSize}
              className="px-1 text-xs bg-gray-100 hover:bg-gray-200"
            >
              ✓
            </button>
          </div>
          <button
            onClick={() => adjustFontSize(0.5)}
            className="p-1 hover:bg-gray-200 rounded"
          >
            <Plus className="w-3 h-3" />
          </button>
        </div>

        {/* Basic Styles & Color Pickers */}
        <div className="flex items-center gap-1 border-r border-gray-300 pr-2">
          <button
            onClick={() => exec("bold")}
            className="p-2 hover:bg-gray-200 rounded"
          >
            <Bold className="w-4 h-4" />
          </button>
          <button
            onClick={() => exec("italic")}
            className="p-2 hover:bg-gray-200 rounded"
          >
            <Italic className="w-4 h-4" />
          </button>
          <button
            onClick={() => exec("underline")}
            className="p-2 hover:bg-gray-200 rounded"
          >
            <Underline className="w-4 h-4" />
          </button>

          {/* Font Color Picker */}
          <div className="relative font-color-wrapper">
            <button
              onClick={() => setShowFontColors(!showFontColors)}
              className="p-2 hover:bg-gray-200 rounded"
            >
              <div className="w-4 h-4 flex flex-col items-center font-bold text-xs">
                A<div className="h-0.5 w-full bg-black"></div>
              </div>
            </button>
            {showFontColors && (
              <div className="absolute z-50 mt-1 bg-white border border-gray-300 shadow-xl p-3 w-max">
                <div className="text-[10px] text-gray-500 mb-1 uppercase font-bold">
                  Theme Colors
                </div>
                <div className="grid grid-cols-10 gap-1 mb-2">
                  {OUTLOOK_THEME_COLORS.flat().map((color) => (
                    <button
                      key={color}
                      onClick={() => {
                        exec("foreColor", color);
                        setShowFontColors(false);
                      }}
                      className="w-5 h-5 border border-gray-200"
                      style={{ backgroundColor: color }}
                    />
                  ))}
                </div>
                <div className="text-[10px] text-gray-500 mb-1 uppercase font-bold">
                  Standard Colors
                </div>
                <div className="flex gap-1">
                  {OUTLOOK_STANDARD_COLORS.map((color) => (
                    <button
                      key={color}
                      onClick={() => {
                        exec("foreColor", color);
                        setShowFontColors(false);
                      }}
                      className="w-5 h-5 border border-gray-200"
                      style={{ backgroundColor: color }}
                    />
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Highlighter Picker */}
          <div className="relative highlight-color-wrapper">
            <button
              onClick={() => setShowHighlightColors(!showHighlightColors)}
              className="p-2 hover:bg-gray-200 rounded"
              title="Highlight Color"
            >
              <div className="w-4 h-4 bg-yellow-300 border border-gray-400"></div>
            </button>
            {showHighlightColors && (
              <div className="absolute z-50 mt-1 bg-white border border-gray-300 shadow-xl p-3 w-[200px]">
                <div className="grid grid-cols-7 gap-1 mb-2">
                  {OUTLOOK_HIGHLIGHT_COLORS.map((color) => (
                    <button
                      key={color}
                      onClick={() => {
                        exec("backColor", color);
                        setShowHighlightColors(false);
                      }}
                      className="w-6 h-6 border border-gray-300 hover:ring-1 hover:ring-blue-400"
                      style={{ backgroundColor: color }}
                    />
                  ))}
                </div>
                <button
                  onClick={() => {
                    exec("backColor", "transparent");
                    setShowHighlightColors(false);
                  }}
                  className="w-full text-left text-xs hover:bg-gray-100 px-1 py-1 border-t mt-1"
                >
                  No Color
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Alignment & Lists & Indent */}
        <div className="flex items-center gap-1 border-r border-gray-300 pr-2">
          <button
            onClick={() => exec("insertUnorderedList")}
            className="p-2 hover:bg-gray-200 rounded"
          >
            <List className="w-4 h-4" />
          </button>
          <button
            onClick={() => exec("insertOrderedList")}
            className="p-2 hover:bg-gray-200 rounded"
          >
            <ListOrdered className="w-4 h-4" />
          </button>
          <button
            onClick={() => exec("outdent")}
            className="p-2 hover:bg-gray-200 rounded"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
          <button
            onClick={() => exec("indent")}
            className="p-2 hover:bg-gray-200 rounded"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
          <button
            onClick={() => exec("justifyLeft")}
            className="p-2 hover:bg-gray-200 rounded"
          >
            <AlignLeft className="w-4 h-4" />
          </button>
          <button
            onClick={() => exec("justifyCenter")}
            className="p-2 hover:bg-gray-200 rounded"
          >
            <AlignCenter className="w-4 h-4" />
          </button>
          <button
            onClick={() => exec("justifyRight")}
            className="p-2 hover:bg-gray-200 rounded"
          >
            <AlignRight className="w-4 h-4" />
          </button>
          <button
            onClick={() => exec("justifyFull")}
            className="p-2 hover:bg-gray-200 rounded"
          >
            <AlignJustify className="w-4 h-4" />
          </button>
        </div>

        {/* Utils */}
        <div className="flex items-center gap-2">
          <div className="flex items-center bg-white border border-gray-300 rounded ml-2">
            <input
              type="number"
              step="0.1"
              className="w-12 text-center text-xs"
              value={lineSpacingValue}
              onChange={(e) => setLineSpacingValue(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && applyLineSpacing()}
            />
            <button
              onClick={applyLineSpacing}
              className="px-1 text-xs bg-gray-100 hover:bg-gray-200"
            >
              ✓
            </button>
          </div>

          <button
            onClick={clearFormattingAndNormalize}
            className="p-2 text-red-500"
          >
            <Eraser className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Content Area */}
      <div
        ref={editorRef}
        contentEditable
        suppressContentEditableWarning
        onKeyDown={handleKeyDown}
        onPaste={handlePaste}
        className="min-h-[200px] overflow-y-auto p-4 focus:outline-none bg-white"
        style={{
          fontFamily: "Calibri, Arial, sans-serif",
          fontSize: "11pt",
          lineHeight: "1.15",
          color: "#000000",
          outline: "none",
        }}
        data-placeholder={placeholder}
      ></div>

      <style jsx>{`
        [data-placeholder]:empty:before {
          content: attr(data-placeholder);
          color: #9ca3af;
          cursor: text;
        }
      `}</style>
    </div>
  );
});

export default OutlookEditor;

// import React, {
//   useState,
//   useEffect,
//   useRef,
//   forwardRef,
//   useImperativeHandle,
// } from "react";
// import {
//   ChevronDown,
//   Minus,
//   Plus,
//   Bold,
//   Italic,
//   Underline,
//   Type,
//   List,
//   ListOrdered,
//   ChevronUp,
//   AlignLeft,
//   AlignCenter,
//   AlignRight,
//   AlignJustify,
//   Eraser,
// } from "lucide-react";

// // ==========================================
// // ✅ CONSTANTS & COLOR PALETTES
// // ==========================================
// const OUTLOOK_THEME_COLORS = [
//   ["#FFFFFF", "#F2F2F2", "#D6D6D6", "#BFBFBF", "#808080", "#404040"],
//   ["#000000", "#262626", "#595959", "#7F7F7F", "#BFBFBF", "#D9D9D9"],
//   ["#D9E1F2", "#B4C6E7", "#8EAADB", "#4472C4", "#2F5597", "#1F3864"],
//   ["#FCE4D6", "#F8CBAD", "#F4B183", "#ED7D31", "#C55A11", "#843C0C"],
//   ["#EDEDED", "#DBDBDB", "#C9C9C9", "#A5A5A5", "#7F7F7F", "#595959"],
//   ["#FFF2CC", "#FFE699", "#FFD966", "#FFC000", "#BF9000", "#7F6000"],
//   ["#DDEBF7", "#BDD7EE", "#9BC2E6", "#5B9BD5", "#2E75B6", "#1F4E79"],
//   ["#E2EFDA", "#C6E0B4", "#A9D18E", "#70AD47", "#548235", "#375623"],
//   ["#D9E2F3", "#B4C7E7", "#8EAADB", "#2F5597", "#1F3864", "#172B4D"],
//   ["#E4DFEC", "#CFC7DC", "#B4A7D6", "#8E7CC3", "#5F497A", "#3F3151"],
// ];

// const OUTLOOK_STANDARD_COLORS = [
//   "#C00000",
//   "#FF0000",
//   "#FFC000",
//   "#FFFF00",
//   "#92D050",
//   "#00B050",
//   "#00B0F0",
//   "#002060",
//   "#7030A0",
// ];

// const OUTLOOK_HIGHLIGHT_COLORS = [
//   "#FFFF00",
//   "#00FF00",
//   "#00FFFF",
//   "#FF00FF",
//   "#0000FF",
//   "#FF0000",
//   "#000080",
//   "#008000",
//   "#800080",
//   "#800000",
//   "#808000",
//   "#808080",
//   "#C0C0C0",
//   "#000000",
// ];

// const OutlookEditor = forwardRef(({ initialContent, placeholder }, ref) => {
//   const editorRef = useRef(null);
//   const moreColorRef = useRef(null);

//   // States
//   const [showFontColors, setShowFontColors] = useState(false);
//   const [showHighlightColors, setShowHighlightColors] = useState(false);
//   const [fontFamily, setFontFamily] = useState("Calibri");
//   const [fontSizeValue, setFontSizeValue] = useState("11");
//   const [lineSpacingValue, setLineSpacingValue] = useState("1.15");

//   // Handle clicking outside color pickers
//   useEffect(() => {
//     const handleClickOutside = (e) => {
//       if (!e.target.closest(".font-color-wrapper")) setShowFontColors(false);
//       if (!e.target.closest(".highlight-color-wrapper"))
//         setShowHighlightColors(false);
//     };
//     document.addEventListener("mousedown", handleClickOutside);
//     return () => document.removeEventListener("mousedown", handleClickOutside);
//   }, []);

//   useEffect(() => {
//     if (editorRef.current && initialContent) {
//       editorRef.current.innerHTML = initialContent;
//     }
//     // ✅ CHANGE "br" TO "p"
//     // This ensures the browser understands we are working with Paragraph blocks
//     document.execCommand("defaultParagraphSeparator", false, "p");
//   }, [initialContent]);
//   useImperativeHandle(ref, () => ({
//     getHtml: () => editorRef.current?.innerHTML || "",
//     setHtml: (html) => {
//       if (editorRef.current) {
//         editorRef.current.innerHTML = html;
//         editorRef.current.focus();
//       }
//     },
//     clear: () => {
//       if (editorRef.current) {
//         editorRef.current.innerHTML = "";
//       }
//     },
//   }));

//   const exec = (command, value = null) => {
//     document.execCommand(command, false, value);
//     editorRef.current?.focus();
//   };

//   const handleFontFamily = (e) => {
//     const val = e.target.value;
//     setFontFamily(val);
//     exec("fontName", val);
//   };

//   const applyFontSize = () => {
//     const sizeStr = fontSizeValue + "pt";
//     const selection = window.getSelection();
//     if (!selection.rangeCount) return;
//     if (selection.isCollapsed) {
//       const span = `<span style="font-size: ${sizeStr}">&nbsp;</span>`;
//       document.execCommand("insertHTML", false, span);
//     } else {
//       applyStyleToSelectionNodes("fontSize", sizeStr);
//     }
//   };

//   const applyStyleToSelectionNodes = (styleProp, value) => {
//     const selection = window.getSelection();
//     if (!selection.rangeCount) return;
//     const range = selection.getRangeAt(0);
//     const tempDiv = document.createElement("div");
//     tempDiv.appendChild(range.cloneContents());

//     const processNodes = (parentNode) => {
//       Array.from(parentNode.childNodes).forEach((child) => {
//         if (child.nodeType === Node.TEXT_NODE) {
//           const span = document.createElement("span");
//           span.style[styleProp] = value;
//           span.textContent = child.textContent;
//           parentNode.replaceChild(span, child);
//         } else if (child.nodeType === Node.ELEMENT_NODE) {
//           processNodes(child);
//         }
//       });
//     };

//     processNodes(tempDiv);
//     document.execCommand("insertHTML", false, tempDiv.innerHTML);
//   };

//   const adjustFontSize = (delta) => {
//     let current = parseFloat(fontSizeValue) || 11;
//     let newSize = parseFloat((current + delta).toFixed(1));
//     if (newSize < 1) newSize = 1;
//     setFontSizeValue(newSize.toString());
//     const sizeStr = newSize + "pt";
//     applyStyleToSelectionNodes("fontSize", sizeStr);
//   };

//   const applyLineSpacing = () => {
//     const val = parseFloat(lineSpacingValue) || 1.15;
//     if (editorRef.current) {
//       editorRef.current.style.lineHeight = val.toString();
//     }
//   };

//   const selectAll = () => {
//     if (editorRef.current) {
//       const range = document.createRange();
//       range.selectNodeContents(editorRef.current);
//       const sel = window.getSelection();
//       sel.removeAllRanges();
//       sel.addRange(range);
//     }
//   };

//   // ✅ UPDATED: Fixed Enter Key Logic to prevent right-shift and focus issues
//   // const handleKeyDown = (e) => {
//   //   if (e.key === "Enter" && !e.shiftKey) {
//   //     e.preventDefault();

//   //     // We insert a Break tag <br> followed by a Zero Width Space (&#8203;).
//   //     // The Zero Width Space gives the cursor a valid character to latch onto on the new line,
//   //     // which fixes the issue where the cursor would "shift right" or require a double click.
//   //     document.execCommand("insertHTML", false, "<br>&#8203;");

//   //     // Optional: Ensure the editor scrolls to the new position
//   //     if (editorRef.current) {
//   //       editorRef.current.scrollTop = editorRef.current.scrollHeight;
//   //     }
//   //   }
//   // };
//   // const handleKeyDown = (e) => {
//   //   if (e.key !== "Enter") return;

//   //   e.preventDefault();

//   //   if (e.shiftKey) {
//   //     // Shift + Enter → single line break
//   //     document.execCommand("insertHTML", false, "<br>");
//   //   } else {
//   //     // Enter → paragraph gap (Outlook behavior)
//   //     document.execCommand("insertHTML", false, "<br><br>");
//   //   }
//   // };
//   const handleKeyDown = (e) => {
//     if (e.key !== "Enter") return;

//     e.preventDefault();

//     if (e.shiftKey) {
//       // Shift + Enter → soft line break (keep as-is)
//       document.execCommand("insertHTML", false, "<br>");
//     } else {
//       // Enter → backend-safe blank line with margin
//       document.execCommand(
//         "insertHTML",
//         false,
//         '<p style="margin:0 0 12px 0;line-height:1.15;"><span>&nbsp;</span></p>',
//       );
//     }
//   };

//   const handlePaste = (e) => {
//     e.preventDefault();
//     const htmlData = e.clipboardData.getData("text/html");
//     const textData = e.clipboardData.getData("text/plain");

//     if (htmlData) {
//       const cleanHtml = htmlData.replace(
//         /<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi,
//         "",
//       );
//       document.execCommand("insertHTML", false, cleanHtml);
//     } else {
//       const normHtml = textData.replace(/\n/g, "<br>");
//       document.execCommand("insertHTML", false, normHtml);
//     }
//   };

//   const clearFormattingAndNormalize = () => {
//     document.execCommand("removeFormat");
//     if (editorRef.current) {
//       editorRef.current.style.lineHeight = "1.15";
//     }
//   };

//   return (
//     <div className="border border-gray-300 rounded-lg overflow-hidden focus-within:ring-2 focus-within:ring-blue-500 focus-within:border-blue-500 bg-white flex flex-col">
//       {/* Toolbar */}
//       <div className="flex flex-wrap items-center gap-2 p-2 bg-gray-50 border-b border-gray-300 select-none">
//         {/* Font Family */}
//         <div className="flex items-center border-r border-gray-300 pr-2">
//           <div className="relative">
//             <select
//               value={fontFamily}
//               onChange={handleFontFamily}
//               className="appearance-none bg-transparent border border-gray-300 rounded px-2 py-1 text-xs w-32 cursor-pointer hover:bg-white hover:border-blue-400 focus:outline-none"
//             >
//               <option value="Calibri">Calibri</option>
//               <option value="Arial">Arial</option>
//               <option value="Times New Roman">Times New Roman</option>
//               <option value="Georgia">Georgia</option>
//               <option value="Verdana">Verdana</option>
//               <option value="Tahoma">Tahoma</option>
//               <option value="Courier New">Courier New</option>
//             </select>
//             <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 pointer-events-none text-gray-500 w-3 h-3" />
//           </div>
//         </div>

//         {/* Font Size */}
//         <div className="flex items-center border-r border-gray-300 pr-2 gap-1">
//           <button
//             onClick={() => adjustFontSize(-0.5)}
//             className="p-1 hover:bg-gray-200 rounded"
//           >
//             <Minus className="w-3 h-3" />
//           </button>
//           <div className="flex items-center border border-gray-300 rounded bg-white">
//             <input
//               type="number"
//               min="1"
//               step="0.5"
//               value={fontSizeValue}
//               onChange={(e) => setFontSizeValue(e.target.value)}
//               onKeyDown={(e) => e.key === "Enter" && applyFontSize()}
//               className="w-10 text-center text-xs p-0.5 focus:outline-none"
//             />
//             <span className="text-xs text-gray-500 pr-1">pt</span>
//             <button
//               onClick={applyFontSize}
//               className="px-1 text-xs bg-gray-100 hover:bg-gray-200"
//             >
//               ✓
//             </button>
//           </div>
//           <button
//             onClick={() => adjustFontSize(0.5)}
//             className="p-1 hover:bg-gray-200 rounded"
//           >
//             <Plus className="w-3 h-3" />
//           </button>
//         </div>

//         {/* Basic Styles & Color Pickers */}
//         <div className="flex items-center gap-1 border-r border-gray-300 pr-2">
//           <button
//             onClick={() => exec("bold")}
//             className="p-2 hover:bg-gray-200 rounded"
//           >
//             <Bold className="w-4 h-4" />
//           </button>
//           <button
//             onClick={() => exec("italic")}
//             className="p-2 hover:bg-gray-200 rounded"
//           >
//             <Italic className="w-4 h-4" />
//           </button>
//           <button
//             onClick={() => exec("underline")}
//             className="p-2 hover:bg-gray-200 rounded"
//           >
//             <Underline className="w-4 h-4" />
//           </button>

//           {/* Font Color Picker */}
//           <div className="relative font-color-wrapper">
//             <button
//               onClick={() => setShowFontColors(!showFontColors)}
//               className="p-2 hover:bg-gray-200 rounded"
//             >
//               <div className="w-4 h-4 flex flex-col items-center font-bold text-xs">
//                 A<div className="h-0.5 w-full bg-black"></div>
//               </div>
//             </button>
//             {showFontColors && (
//               <div className="absolute z-50 mt-1 bg-white border border-gray-300 shadow-xl p-3 w-max">
//                 <div className="text-[10px] text-gray-500 mb-1 uppercase font-bold">
//                   Theme Colors
//                 </div>
//                 <div className="grid grid-cols-10 gap-1 mb-2">
//                   {OUTLOOK_THEME_COLORS.flat().map((color) => (
//                     <button
//                       key={color}
//                       onClick={() => {
//                         exec("foreColor", color);
//                         setShowFontColors(false);
//                       }}
//                       className="w-5 h-5 border border-gray-200"
//                       style={{ backgroundColor: color }}
//                     />
//                   ))}
//                 </div>
//                 <div className="text-[10px] text-gray-500 mb-1 uppercase font-bold">
//                   Standard Colors
//                 </div>
//                 <div className="flex gap-1">
//                   {OUTLOOK_STANDARD_COLORS.map((color) => (
//                     <button
//                       key={color}
//                       onClick={() => {
//                         exec("foreColor", color);
//                         setShowFontColors(false);
//                       }}
//                       className="w-5 h-5 border border-gray-200"
//                       style={{ backgroundColor: color }}
//                     />
//                   ))}
//                 </div>
//               </div>
//             )}
//           </div>

//           {/* Highlighter Picker */}
//           <div className="relative highlight-color-wrapper">
//             <button
//               onClick={() => setShowHighlightColors(!showHighlightColors)}
//               className="p-2 hover:bg-gray-200 rounded"
//               title="Highlight Color"
//             >
//               <div className="w-4 h-4 bg-yellow-300 border border-gray-400"></div>
//             </button>
//             {showHighlightColors && (
//               <div className="absolute z-50 mt-1 bg-white border border-gray-300 shadow-xl p-3 w-[200px]">
//                 <div className="grid grid-cols-7 gap-1 mb-2">
//                   {OUTLOOK_HIGHLIGHT_COLORS.map((color) => (
//                     <button
//                       key={color}
//                       onClick={() => {
//                         exec("backColor", color);
//                         setShowHighlightColors(false);
//                       }}
//                       className="w-6 h-6 border border-gray-300 hover:ring-1 hover:ring-blue-400"
//                       style={{ backgroundColor: color }}
//                     />
//                   ))}
//                 </div>
//                 <button
//                   onClick={() => {
//                     exec("backColor", "transparent");
//                     setShowHighlightColors(false);
//                   }}
//                   className="w-full text-left text-xs hover:bg-gray-100 px-1 py-1 border-t mt-1"
//                 >
//                   No Color
//                 </button>
//               </div>
//             )}
//           </div>
//         </div>

//         {/* Alignment & Lists */}
//         <div className="flex items-center gap-1">
//           <button
//             onClick={() => exec("insertUnorderedList")}
//             className="p-2 hover:bg-gray-200 rounded"
//           >
//             <List className="w-4 h-4" />
//           </button>
//           <button
//             onClick={() => exec("justifyLeft")}
//             className="p-2 hover:bg-gray-200 rounded"
//           >
//             <AlignLeft className="w-4 h-4" />
//           </button>
//           <button
//             onClick={() => exec("justifyCenter")}
//             className="p-2 hover:bg-gray-200 rounded"
//           >
//             <AlignCenter className="w-4 h-4" />
//           </button>

//           <div className="flex items-center bg-white border border-gray-300 rounded ml-2">
//             <input
//               type="number"
//               step="0.1"
//               className="w-12 text-center text-xs"
//               value={lineSpacingValue}
//               onChange={(e) => setLineSpacingValue(e.target.value)}
//               onKeyDown={(e) => e.key === "Enter" && applyLineSpacing()}
//             />
//             <button
//               onClick={applyLineSpacing}
//               className="px-1 text-xs bg-gray-100 hover:bg-gray-200"
//             >
//               ✓
//             </button>
//           </div>

//           <button
//             onClick={clearFormattingAndNormalize}
//             className="p-2 text-red-500"
//           >
//             <Eraser className="w-4 h-4" />
//           </button>
//           <button onClick={selectAll} className="text-xs text-blue-600 px-2">
//             Select All
//           </button>
//         </div>
//       </div>

//       {/* Content Area */}
//       {/* <div
//         ref={editorRef}
//         contentEditable
//         suppressContentEditableWarning
//         onKeyDown={handleKeyDown}
//         onPaste={handlePaste}
//         className="min-h-[200px] overflow-y-auto p-4 focus:outline-none bg-white"
//         style={{
//           fontFamily: "Calibri, Arial, sans-serif",
//           fontSize: "11pt",
//           lineHeight: lineSpacingValue,
//           color: "#000000",
//           outline: "none",
//         }}
//         placeholder={placeholder}
//       ></div> */}
//       <div
//         ref={editorRef}
//         contentEditable
//         suppressContentEditableWarning
//         onKeyDown={handleKeyDown}
//         onPaste={handlePaste}
//         className="min-h-[200px] overflow-y-auto p-4 focus:outline-none bg-white"
//         style={{
//           fontFamily: "Calibri, Arial, sans-serif",
//           fontSize: "11pt",
//           lineHeight: lineSpacingValue,
//           color: "#000000",
//           outline: "none",
//         }}
//       >
//         {/* <div
//           className="editor-typing-layer"
//           style={{ whiteSpace: "pre-wrap" }} // ✅ ONLY HERE
//         /> */}
//       </div>
//     </div>
//   );
// });

// export default OutlookEditor;
