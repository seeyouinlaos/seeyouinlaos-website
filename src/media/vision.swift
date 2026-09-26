// THE MEDIA AGENT'S EYES (Owner, 26 Sep 2026): Apple Vision on a still image — the faces (with the head extended above the
// detected face box) and the attention-saliency region — as normalised boxes in TOP-LEFT image coordinates, printed as one
// JSON line per image. Used by src/media/media-qa.mjs to prove a crop keeps every head, face and the subject inside the frame.
// Build once: swiftc -O src/media/vision.swift -o <bin>   ·   run: <bin> image1.jpg image2.jpg …
import Foundation
import Vision
import ImageIO

func box(_ r: CGRect) -> [String: Double] {   // Vision is bottom-left origin; the page is top-left
  return ["x": Double(r.minX), "y": Double(1 - r.maxY), "w": Double(r.width), "h": Double(r.height)]
}
for path in CommandLine.arguments.dropFirst() {
  let url = URL(fileURLWithPath: path)
  guard let src = CGImageSourceCreateWithURL(url as CFURL, nil),
        let img = CGImageSourceCreateImageAtIndex(src, 0, [kCGImageSourceShouldCacheImmediately: true] as CFDictionary) else {
    print("{\"file\":\(String(reflecting: path)),\"error\":\"unreadable\"}"); continue
  }
  let faces = VNDetectFaceRectanglesRequest()
  let humans = VNDetectHumanRectanglesRequest(); humans.upperBodyOnly = false
  let attention = VNGenerateAttentionBasedSaliencyImageRequest()
  let handler = VNImageRequestHandler(cgImage: img, options: [:])
  try? handler.perform([faces, humans, attention])
  var out: [String: Any] = ["file": path, "w": img.width, "h": img.height]
  out["faces"] = (faces.results ?? []).filter { $0.confidence > 0.5 }.map { f -> [String: Double] in
    var b = box(f.boundingBox)
    // the head, not only the face: extend the face box upward by 45 % of its height and sideways by 15 %
    let ext = b["h"]! * 0.45, side = b["w"]! * 0.15
    b["y"] = max(0, b["y"]! - ext); b["h"] = b["h"]! + ext; b["x"] = max(0, b["x"]! - side); b["w"] = min(1 - b["x"]!, b["w"]! + 2 * side)
    b["c"] = Double(f.confidence); return b
  }
  out["people"] = (humans.results ?? []).filter { $0.confidence > 0.6 }.map { box($0.boundingBox) }
  if let s = attention.results?.first, let objs = s.salientObjects, !objs.isEmpty {
    var u = objs[0].boundingBox; for o in objs.dropFirst() { u = u.union(o.boundingBox) }
    out["salient"] = box(u)
  }
  if let d = try? JSONSerialization.data(withJSONObject: out, options: [.sortedKeys]), let s = String(data: d, encoding: .utf8) { print(s) }
}
