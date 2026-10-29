import { useState } from "react";
import { Document, Page, pdfjs } from "react-pdf";
import "react-pdf/dist/Page/AnnotationLayer.css";
import "react-pdf/dist/Page/TextLayer.css";
import { ChevronLeftIcon } from "./icons";

// pdf.js does its actual parsing/rendering work off the main thread, in a
// worker script it loads by URL — this points it at the copy react-pdf's
// own dependency (pdfjs-dist) ships, built via Vite's `?url` convention so
// the worker file is included in the production bundle rather than
// expected to exist at some CDN URL at runtime.
pdfjs.GlobalWorkerOptions.workerSrc = new URL(
  "pdfjs-dist/build/pdf.worker.min.mjs",
  import.meta.url,
).toString();

type Props = {
  fileUrl: string;
};

/**
 * One page at a time with Prev/Next, not a continuous scroll — matches
 * this app's single-screen-at-a-time mobile shell (see
 * PROJECT_STARTING_POINT.md) better than a long scrollable document would
 * on a phone-width viewport.
 */
export default function SlideViewer({ fileUrl }: Props) {
  const [numPages, setNumPages] = useState<number | null>(null);
  const [pageNumber, setPageNumber] = useState(1);
  const [loadError, setLoadError] = useState(false);

  // No outer card chrome (border/shadow/padding) — every caller renders
  // this inside its own already-styled container, matching the sibling
  // branches (body text, url link) this replaces at the same call site.
  if (loadError) {
    return (
      <div className="text-center">
        <p className="text-sm text-gray-400">
          Couldn't load this slide deck.
        </p>
        <a
          href={fileUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="mt-2 inline-block text-sm font-medium text-brand-600 underline"
        >
          Open the PDF directly
        </a>
      </div>
    );
  }

  return (
    <div>
      <Document
        file={fileUrl}
        onLoadSuccess={({ numPages }) => setNumPages(numPages)}
        onLoadError={() => setLoadError(true)}
        loading={
          <p className="py-10 text-center text-sm text-gray-400">
            Loading slides…
          </p>
        }
      >
        <Page
          pageNumber={pageNumber}
          width={340}
          className="mx-auto overflow-hidden rounded-xl"
        />
      </Document>

      {numPages && (
        <div className="mt-3 flex items-center justify-between">
          <button
            type="button"
            onClick={() => setPageNumber((p) => Math.max(1, p - 1))}
            disabled={pageNumber <= 1}
            className="flex items-center gap-1 rounded-lg px-3 py-1.5 text-sm font-medium text-brand-600 disabled:text-gray-300"
          >
            <ChevronLeftIcon className="h-4 w-4" />
            Prev
          </button>
          <span className="text-xs text-gray-400">
            Page {pageNumber} of {numPages}
          </span>
          <button
            type="button"
            onClick={() => setPageNumber((p) => Math.min(numPages, p + 1))}
            disabled={pageNumber >= numPages}
            className="rounded-lg px-3 py-1.5 text-sm font-medium text-brand-600 disabled:text-gray-300"
          >
            Next
          </button>
        </div>
      )}
    </div>
  );
}
