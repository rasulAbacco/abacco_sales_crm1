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
  Type,
  List,
  ListOrdered,
  ChevronUp,
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

  useEffect(() => {
    if (editorRef.current && initialContent) {
      editorRef.current.innerHTML = initialContent;
    }
    // This tells the browser to use <br> instead of <p> or <div> on enter
    document.execCommand("defaultParagraphSeparator", false, "br");
  }, [initialContent]);

  useImperativeHandle(ref, () => ({
    getHtml: () => editorRef.current?.innerHTML || "",
    setHtml: (html) => {
      if (editorRef.current) {
        editorRef.current.innerHTML = html;
        editorRef.current.focus();
      }
    },
    clear: () => {
      if (editorRef.current) {
        editorRef.current.innerHTML = "";
      }
    },
  }));

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
    if (editorRef.current) {
      editorRef.current.style.lineHeight = val.toString();
    }
  };

  const selectAll = () => {
    if (editorRef.current) {
      const range = document.createRange();
      range.selectNodeContents(editorRef.current);
      const sel = window.getSelection();
      sel.removeAllRanges();
      sel.addRange(range);
    }
  };

  // ✅ UPDATED: Fixed Enter Key Logic to prevent right-shift and focus issues
  const handleKeyDown = (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();

      // We insert a Break tag <br> followed by a Zero Width Space (&#8203;).
      // The Zero Width Space gives the cursor a valid character to latch onto on the new line,
      // which fixes the issue where the cursor would "shift right" or require a double click.
      document.execCommand("insertHTML", false, "<br>&#8203;");

      // Optional: Ensure the editor scrolls to the new position
      if (editorRef.current) {
        editorRef.current.scrollTop = editorRef.current.scrollHeight;
      }
    }
  };

  const handlePaste = (e) => {
    e.preventDefault();
    const htmlData = e.clipboardData.getData("text/html");
    const textData = e.clipboardData.getData("text/plain");

    if (htmlData) {
      const cleanHtml = htmlData.replace(
        /<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi,
        "",
      );
      document.execCommand("insertHTML", false, cleanHtml);
    } else {
      const normHtml = textData.replace(/\n/g, "<br>");
      document.execCommand("insertHTML", false, normHtml);
    }
  };

  const clearFormattingAndNormalize = () => {
    document.execCommand("removeFormat");
    if (editorRef.current) {
      editorRef.current.style.lineHeight = "1.15";
    }
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

        {/* Alignment & Lists */}
        <div className="flex items-center gap-1">
          <button
            onClick={() => exec("insertUnorderedList")}
            className="p-2 hover:bg-gray-200 rounded"
          >
            <List className="w-4 h-4" />
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
          <button onClick={selectAll} className="text-xs text-blue-600 px-2">
            Select All
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
          lineHeight: lineSpacingValue,
          color: "#000000",
          outline: "none",
        }}
        placeholder={placeholder}
      ></div>
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
//   // Dark 1
//   ["#FFFFFF", "#F2F2F2", "#D6D6D6", "#BFBFBF", "#808080", "#404040"],
//   // Light 1
//   ["#000000", "#262626", "#595959", "#7F7F7F", "#BFBFBF", "#D9D9D9"],
//   // Blue
//   ["#D9E1F2", "#B4C6E7", "#8EAADB", "#4472C4", "#2F5597", "#1F3864"],
//   // Orange
//   ["#FCE4D6", "#F8CBAD", "#F4B183", "#ED7D31", "#C55A11", "#843C0C"],
//   // Gray
//   ["#EDEDED", "#DBDBDB", "#C9C9C9", "#A5A5A5", "#7F7F7F", "#595959"],
//   // Gold
//   ["#FFF2CC", "#FFE699", "#FFD966", "#FFC000", "#BF9000", "#7F6000"],
//   // Light Blue
//   ["#DDEBF7", "#BDD7EE", "#9BC2E6", "#5B9BD5", "#2E75B6", "#1F4E79"],
//   // Green
//   ["#E2EFDA", "#C6E0B4", "#A9D18E", "#70AD47", "#548235", "#375623"],
//   // Dark Blue
//   ["#D9E2F3", "#B4C7E7", "#8EAADB", "#2F5597", "#1F3864", "#172B4D"],
//   // Purple
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
//   "#FFFF00", // Yellow
//   "#00FF00", // Bright Green
//   "#00FFFF", // Cyan
//   "#FF00FF", // Magenta
//   "#0000FF", // Blue
//   "#FF0000", // Red
//   "#000080", // Dark Blue
//   "#008000", // Dark Green
//   "#800080", // Purple
//   "#800000", // Maroon
//   "#808000", // Olive
//   "#808080", // Gray
//   "#C0C0C0", // Light Gray
//   "#000000", // Black
// ];

// const OutlookEditor = forwardRef(({ initialContent, placeholder }, ref) => {
//   const editorRef = useRef(null); // DOM ref
//   const apiRef = useRef(null); // exposed API
//   const moreColorRef = useRef(null);
//   const [showFontColors, setShowFontColors] = useState(false);
//   const [showHighlightColors, setShowHighlightColors] = useState(false);

//   // Toolbar State
//   const [fontFamily, setFontFamily] = useState("Calibri");
//   const [fontSizeValue, setFontSizeValue] = useState("11");
//   const [lineSpacingValue, setLineSpacingValue] = useState("1.15");

//   // Connect parent ref to internal div
//   // useEffect(() => {
//   //   if (ref) ref.current = editorRef.current;
//   // }, [ref]);

//   // Initialize Content
//   // useEffect(() => {
//   //   if (editorRef.current && initialContent) {
//   //     editorRef.current.innerHTML = initialContent;
//   //   }
//   //   document.execCommand("defaultParagraphSeparator", false, "p");
//   // }, [initialContent]);

//   // Handle clicking outside color pickers
//   useEffect(() => {
//     const handleClickOutside = (e) => {
//       if (!e.target.closest(".font-color-wrapper")) {
//         setShowFontColors(false);
//       }
//       if (!e.target.closest(".highlight-color-wrapper")) {
//         setShowHighlightColors(false);
//       }
//     };

//     document.addEventListener("mousedown", handleClickOutside);
//     return () => document.removeEventListener("mousedown", handleClickOutside);
//   }, []);
//   useImperativeHandle(ref, () => ({
//     getHtml: () => {
//       return editorRef.current?.innerHTML || "";
//     },

//     setHtml: (html) => {
//       if (editorRef.current) {
//         editorRef.current.innerHTML = html;
//         editorRef.current.focus();
//       }
//     },

//     clear: () => {
//       if (editorRef.current) {
//         editorRef.current.innerHTML = `<p style="margin:0 0 12px 0;"><br></p>`;
//       }
//     },
//   }));

//   // --- Core Formatting Command ---
//   const exec = (command, value = null) => {
//     document.execCommand(command, false, value);
//     editorRef.current?.focus();
//   };

//   // --- Font Family ---
//   const handleFontFamily = (e) => {
//     const val = e.target.value;
//     setFontFamily(val);
//     exec("fontName", val);
//   };

//   // --- Manual Font Size Handler ---
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

//   // --- Helper: Apply Inline Style to Text Nodes ---
//   const applyStyleToSelectionNodes = (styleProp, value) => {
//     const selection = window.getSelection();
//     if (!selection.rangeCount) return;
//     const range = selection.getRangeAt(0);

//     const tempDiv = document.createElement("div");
//     tempDiv.appendChild(range.cloneContents());

//     const processNodes = (parentNode) => {
//       const children = Array.from(parentNode.childNodes);
//       children.forEach((child) => {
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

//   // --- Helper: Adjust Font Size Step ---
//   const adjustFontSize = (delta) => {
//     let current = parseFloat(fontSizeValue);
//     if (isNaN(current)) current = 11;

//     let newSize = parseFloat((current + delta).toFixed(1));
//     if (newSize < 1) newSize = 1;

//     setFontSizeValue(newSize.toString());

//     const sizeStr = newSize + "pt";
//     const selection = window.getSelection();
//     if (!selection.rangeCount) return;

//     if (selection.isCollapsed) {
//       document.execCommand(
//         "insertHTML",
//         false,
//         `<span style="font-size:${sizeStr}">&nbsp;</span>`,
//       );
//     } else {
//       applyStyleToSelectionNodes("fontSize", sizeStr);
//     }
//   };

//   // --- Manual Line Spacing Handler ---
//   const applyLineSpacing = () => {
//     const val = parseFloat(lineSpacingValue);
//     const valStr = val.toString();

//     const selection = window.getSelection();
//     if (selection.rangeCount === 0) return;

//     let anchorNode = selection.anchorNode;
//     while (
//       anchorNode &&
//       anchorNode.nodeName !== "P" &&
//       anchorNode.nodeName !== "DIV"
//     ) {
//       anchorNode = anchorNode.parentNode;
//     }

//     const applyStyle = (element) => {
//       if (!element || (element.nodeName !== "P" && element.nodeName !== "DIV"))
//         return;
//       element.style.lineHeight = valStr;

//       if (val <= 1.0) {
//         element.style.marginBottom = "0px";
//         element.style.marginTop = "0px";
//       } else {
//         element.style.marginBottom = "12px";
//       }
//     };

//     if (anchorNode) applyStyle(anchorNode);

//     const range = selection.getRangeAt(0);
//     const container = range.commonAncestorContainer;
//     if (container && container.nodeName !== "P") {
//       const allPs = container.querySelectorAll("p");
//       allPs.forEach((p) => {
//         if (selection.containsNode(p, true)) {
//           applyStyle(p);
//         }
//       });
//     }
//   };

//   // --- Manual Select All ---
//   const selectAll = () => {
//     if (editorRef.current) {
//       const range = document.createRange();
//       range.selectNodeContents(editorRef.current);
//       const sel = window.getSelection();
//       sel.removeAllRanges();
//       sel.addRange(range);
//     }
//   };

//   // --- Paste Logic ---
//   const handlePaste = (e) => {
//     e.preventDefault();
//     const htmlData = e.clipboardData.getData("text/html");
//     const textData = e.clipboardData.getData("text/plain");

//     if (htmlData && htmlData.trim().length > 0) {
//       const cleanHtml = htmlData.replace(
//         /<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi,
//         "",
//       );
//       document.execCommand("insertHTML", false, cleanHtml);
//     } else {
//       const paragraphs = textData.split(/\n\s*\n/);
//       const normHtml = paragraphs
//         .map((para) => {
//           const lines = para.trim().replace(/\n/g, "<br>");
//           return lines
//             ? `<p style="margin:0 0 12px 0;font-family:Calibri,Arial,sans-serif;font-size:11pt;line-height:1.15;">${lines}</p>`
//             : "";
//         })
//         .filter((p) => p)
//         .join("");
//       document.execCommand("insertHTML", false, normHtml);
//     }
//   };
//   const clearFormattingAndNormalize = () => {
//     document.execCommand("removeFormat");

//     setTimeout(() => {
//       if (!editorRef.current) return;

//       editorRef.current.querySelectorAll("p, div").forEach((el) => {
//         el.style.fontFamily = "Calibri, Arial, sans-serif";
//         el.style.fontSize = "11pt";
//         el.style.lineHeight = "1.15";
//         el.style.marginBottom = "12px";
//       });
//     }, 0);
//   };

//   return (
//     <div className="border border-gray-300 rounded-lg overflow-hidden focus-within:ring-2 focus-within:ring-blue-500 focus-within:border-blue-500 bg-white flex flex-col">
//       {/* Toolbar */}
//       <div className="flex flex-wrap items-center gap-2 p-2 bg-gray-50 border-b border-gray-300 select-none">
//         {/* Group 1: Font Family */}
//         <div className="flex items-center border-r border-gray-300 pr-2">
//           <div className="relative group">
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
//               <option value="Trebuchet MS">Trebuchet MS</option>
//               <option value="Courier New">Courier New</option>
//             </select>
//             <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 pointer-events-none text-gray-500 w-3 h-3" />
//           </div>
//         </div>

//         {/* Group 2: Font Size (Manual Input) */}
//         <div className="flex items-center border-r border-gray-300 pr-2 gap-1">
//           <button
//             onClick={() => adjustFontSize(-0.1)}
//             className="p-1 hover:bg-gray-200 rounded text-gray-700"
//             title="Decrease Font Size"
//           >
//             <Minus className="w-3 h-3" />
//           </button>

//           <div className="flex items-center border border-gray-300 rounded bg-white">
//             <input
//               type="number"
//               step="0.1"
//               min="1"
//               value={fontSizeValue}
//               onChange={(e) => setFontSizeValue(e.target.value)}
//               onKeyDown={(e) => e.key === "Enter" && applyFontSize()}
//               className="w-14 text-center text-xs p-0.5 focus:outline-none"
//             />
//             <span className="text-xs text-gray-500 pr-1">pt</span>
//             <button
//               onClick={applyFontSize}
//               className="px-1 text-xs font-semibold text-gray-600 hover:bg-gray-200 rounded"
//               title="Apply Font Size"
//             >
//               ✓
//             </button>
//           </div>

//           <button
//             onClick={() => adjustFontSize(0.1)}
//             className="p-1 hover:bg-gray-200 rounded text-gray-700"
//             title="Increase Font Size"
//           >
//             <Plus className="w-3 h-3" />
//           </button>
//         </div>

//         {/* Group 3: Basic Formatting */}
//         <div className="flex items-center gap-1 border-r border-gray-300 pr-2">
//           <button
//             onClick={() => exec("bold")}
//             className="p-2 hover:bg-gray-200 rounded transition-colors"
//             title="Bold"
//           >
//             <Bold className="w-4 h-4 text-gray-600" />
//           </button>
//           <button
//             onClick={() => exec("italic")}
//             className="p-2 hover:bg-gray-200 rounded transition-colors"
//             title="Italic"
//           >
//             <Italic className="w-4 h-4 text-gray-600" />
//           </button>
//           <button
//             onClick={() => exec("underline")}
//             className="p-2 hover:bg-gray-200 rounded transition-colors"
//             title="Underline"
//           >
//             <Underline className="w-4 h-4 text-gray-600" />
//           </button>
//           <button
//             onClick={() => exec("strikeThrough")}
//             className="p-2 hover:bg-gray-200 rounded transition-colors"
//             title="Strikethrough"
//           >
//             <Type className="w-4 h-4 text-gray-600" />
//           </button>

//           <div className="relative">
//             <input
//               type="color"
//               ref={moreColorRef}
//               className="hidden"
//               onChange={(e) => {
//                 exec("foreColor", e.target.value);
//                 setShowFontColors(false);
//               }}
//             />

//             <div className="relative font-color-wrapper">
//               {/* Font Color Button */}
//               <button
//                 onClick={() => setShowFontColors((v) => !v)}
//                 className="p-2 hover:bg-gray-200 rounded transition-colors"
//                 title="Font Color"
//               >
//                 <div
//                   className="w-4 h-4 flex items-center justify-center font-semibold"
//                   style={{ borderBottom: "2px solid #000" }}
//                 >
//                   A
//                 </div>
//               </button>

//               {/* Outlook-style Palette */}
//               {showFontColors && (
//                 <div className="absolute z-50 mt-1 bg-white border border-gray-300 shadow-lg rounded-md p-3">
//                   {/* Theme Colors */}
//                   <div className="text-[11px] text-gray-500 mb-1">
//                     Theme Colors
//                   </div>

//                   <div className="flex gap-1 mb-3">
//                     {OUTLOOK_THEME_COLORS.map((column, colIndex) => (
//                       <div key={colIndex} className="flex flex-col gap-1">
//                         {column.map((color) => (
//                           <button
//                             key={color}
//                             onClick={() => {
//                               exec("foreColor", color);
//                               setShowFontColors(false);
//                             }}
//                             className="w-6 h-6 border border-gray-400 hover:ring-2 hover:ring-blue-400"
//                             style={{ backgroundColor: color }}
//                             title={color}
//                           />
//                         ))}
//                       </div>
//                     ))}
//                   </div>

//                   {/* Standard Colors */}
//                   <div className="text-[11px] text-gray-500 mb-1">
//                     Standard Colors
//                   </div>
//                   <div className="flex gap-1 mb-3">
//                     {OUTLOOK_STANDARD_COLORS.map((color) => (
//                       <button
//                         key={color}
//                         onClick={() => {
//                           exec("foreColor", color);
//                           setShowFontColors(false);
//                         }}
//                         className="w-6 h-6 border border-gray-400 hover:ring-2 hover:ring-blue-400"
//                         style={{ backgroundColor: color }}
//                         title={color}
//                       />
//                     ))}
//                   </div>

//                   {/* More Colors */}
//                   <div className="pt-2 border-t border-gray-200">
//                     <button
//                       onClick={() => moreColorRef.current?.click()}
//                       className="w-full text-left text-sm text-blue-600 hover:underline"
//                     >
//                       More Colors…
//                     </button>
//                   </div>
//                 </div>
//               )}
//             </div>
//           </div>
//           <div className="relative highlight-color-wrapper">
//             <button
//               onClick={() => setShowHighlightColors((v) => !v)}
//               className="p-2 hover:bg-gray-200 rounded transition-colors"
//               title="Text Highlight Color"
//             >
//               <div className="w-4 h-4 bg-yellow-300 border border-gray-400"></div>
//             </button>

//             {showHighlightColors && (
//               <div className="absolute z-50 mt-1 bg-white border border-gray-300 shadow-lg rounded-md p-3 w-[200px]">
//                 {/* Highlight colors */}
//                 <div className="grid grid-cols-7 gap-2 mb-3">
//                   {OUTLOOK_HIGHLIGHT_COLORS.map((color) => (
//                     <button
//                       key={color}
//                       onClick={() => {
//                         exec("backColor", color);
//                         setShowHighlightColors(false);
//                       }}
//                       className="w-6 h-6 border border-gray-400 hover:ring-2 hover:ring-blue-400"
//                       style={{ backgroundColor: color }}
//                       title={color}
//                     />
//                   ))}
//                 </div>

//                 {/* No Color */}
//                 <button
//                   onClick={() => {
//                     exec("backColor", "transparent");
//                     setShowHighlightColors(false);
//                   }}
//                   className="w-full text-left text-sm hover:bg-gray-100 px-1 py-0.5"
//                 >
//                   No Color
//                 </button>

//                 {/* Stop Highlighting */}
//                 <button
//                   onClick={() => {
//                     exec("removeFormat");
//                     setShowHighlightColors(false);
//                   }}
//                   className="w-full text-left text-sm hover:bg-gray-100 px-1 py-0.5"
//                 >
//                   Stop Highlighting
//                 </button>
//               </div>
//             )}
//           </div>
//         </div>

//         {/* Group 4: Paragraph & Alignment */}
//         <div className="flex items-center gap-1 border-r border-gray-300 pr-2">
//           <button
//             onClick={() => exec("insertUnorderedList")}
//             className="p-2 hover:bg-gray-200 rounded transition-colors"
//             title="Bullets"
//           >
//             <List className="w-4 h-4 text-gray-600" />
//           </button>
//           <button
//             onClick={() => exec("insertOrderedList")}
//             className="p-2 hover:bg-gray-200 rounded transition-colors"
//             title="Numbering"
//           >
//             <ListOrdered className="w-4 h-4 text-gray-600" />
//           </button>

//           <button
//             onClick={() => exec("outdent")}
//             className="p-2 hover:bg-gray-200 rounded transition-colors"
//             title="Decrease Indent"
//           >
//             <ChevronUp className="w-4 h-4 text-gray-600" />
//           </button>
//           <button
//             onClick={() => exec("indent")}
//             className="p-2 hover:bg-gray-200 rounded transition-colors"
//             title="Increase Indent"
//           >
//             <ChevronDown className="w-4 h-4 text-gray-600" />
//           </button>

//           <button
//             onClick={() => exec("justifyLeft")}
//             className="p-2 hover:bg-gray-200 rounded transition-colors"
//             title="Align Left"
//           >
//             <AlignLeft className="w-4 h-4 text-gray-600" />
//           </button>
//           <button
//             onClick={() => exec("justifyCenter")}
//             className="p-2 hover:bg-gray-200 rounded transition-colors"
//             title="Align Center"
//           >
//             <AlignCenter className="w-4 h-4 text-gray-600" />
//           </button>
//           <button
//             onClick={() => exec("justifyRight")}
//             className="p-2 hover:bg-gray-200 rounded transition-colors"
//             title="Align Right"
//           >
//             <AlignRight className="w-4 h-4 text-gray-600" />
//           </button>
//           <button
//             onClick={() => exec("justifyFull")}
//             className="p-2 hover:bg-gray-200 rounded transition-colors"
//             title="Justify"
//           >
//             <AlignJustify className="w-4 h-4 text-gray-600" />
//           </button>
//         </div>

//         {/* Group 5: Line Spacing (Manual Input) & Utils */}
//         <div className="flex items-center gap-2">
//           {/* Manual Line Spacing Input */}
//           <div className="flex items-center bg-white border border-gray-300 rounded px-1">
//             <span className="text-xs text-gray-500 ml-1" title="Line Spacing">
//               Spacing:
//             </span>
//             <input
//               type="number"
//               step="0.05"
//               value={lineSpacingValue}
//               onChange={(e) => setLineSpacingValue(e.target.value)}
//               onKeyDown={(e) => e.key === "Enter" && applyLineSpacing()}
//               className="w-12 text-center text-xs p-0.5 focus:outline-none"
//               min="1"
//             />
//             <button
//               onClick={applyLineSpacing}
//               className="p-1 bg-gray-100 hover:bg-gray-200 rounded text-gray-600 text-xs font-semibold"
//               title="Apply Spacing"
//             >
//               ✓
//             </button>
//           </div>

//           <button
//             onClick={clearFormattingAndNormalize}
//             className="p-2 hover:bg-gray-200 rounded transition-colors text-red-500"
//             title="Clear Formatting"
//           >
//             <Eraser className="w-4 h-4" />
//           </button>

//           {/* Manual Select All Button */}
//           <button
//             onClick={selectAll}
//             className="px-2 py-1 text-xs font-medium bg-blue-50 text-blue-600 rounded hover:bg-blue-100 transition-colors"
//             title="Select All"
//           >
//             Select All
//           </button>
//         </div>
//       </div>

//       {/* Content Area */}
//       <div
//         ref={editorRef}
//         contentEditable
//         suppressContentEditableWarning
//         className="min-h-[120px] overflow-y-auto p-4 focus:outline-none bg-white resize-y"
//         style={{
//           fontFamily: "Calibri, Arial, sans-serif",
//           fontSize: "11pt",
//           lineHeight: "1.15",
//           color: "#000000",
//           resize: "vertical",
//           maxHeight: "70vh",
//           whiteSpace: "normal",
//           wordBreak: "break-word",
//         }}
//         placeholder={placeholder}
//         onPaste={handlePaste}
//       ></div>
//     </div>
//   );
// });

// export default OutlookEditor;
