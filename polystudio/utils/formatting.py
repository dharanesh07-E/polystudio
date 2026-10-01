"""Formatting helpers."""

def pretty_table(headers, rows):
    if not headers:
        return "(no result)"
    widths = [len(h) for h in headers]
    for row in rows:
        for i, v in enumerate(row):
            widths[i] = max(widths[i], len(str(v)))
    line = "+" + "+".join("-" * (w + 2) for w in widths) + "+"
    out = [line]
    out.append("| " + " | ".join(h.ljust(widths[i])
                                  for i, h in enumerate(headers)) + " |")
    out.append(line)
    for row in rows:
        out.append("| " + " | ".join(str(v).ljust(widths[i])
                                      for i, v in enumerate(row)) + " |")
    out.append(line)
    return "\n".join(out)