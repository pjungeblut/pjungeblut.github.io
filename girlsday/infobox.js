// Diese Datei verwaltet die kleine Infobox in der rechten unteren Ecke.
//
// In dieser Datein muessen wir nichts veraendern.

class InfoBox {
  RADIUS = 10;

  constructor(info_n_id, info_delay_id, info_rules_id, size, delay, colors,
        compute_color) {
    this.display_size(info_n_id, size);
    this.display_delay(info_delay_id, delay);
    this.display_rules(info_rules_id, colors, compute_color);
  }

  display_size(info_n_id, size) {
    const info_n = document.getElementById(info_n_id);
    info_n.innerHTML = size;
  }

  display_delay(info_delay_id, delay) {
    const info_delay = document.getElementById(info_delay_id);
    info_delay.innerHTML = delay;
  }

  display_rules(info_rules_id, colors, compute_color) {
    // Berechnet die Groesse der Regeltabelle.
    const canvas = document.getElementById(info_rules_id);
    const dimensions = (colors.length + 1) * this.RADIUS * 2 + colors.length;
    canvas.width = dimensions;
    canvas.height = dimensions;
    const ctx = canvas.getContext("2d");

    // Zeichnet die Gitterlinien.
    const offset = this.RADIUS * 2 + 0.5;
    ctx.strokeStyle = "black";
    ctx.beginPath();
    ctx.moveTo(0, offset);
    ctx.lineTo(dimensions, offset);
    ctx.stroke();
    ctx.closePath();
    ctx.beginPath();
    ctx.moveTo(offset, 0);
    ctx.lineTo(offset, dimensions)
    ctx.stroke();
    ctx.closePath();

    // Zeichnet die Regeln.
    for (let i = 0; i < colors.length; ++i) {
      const offset = (i + 1) * this.RADIUS * 2 + (i + 1) + this.RADIUS;
      ctx.fillStyle = colors[i];
      ctx.strokeStyle = "black";
      ctx.beginPath();
      ctx.arc(this.RADIUS, offset, this.RADIUS - 2, 0, 2 * Math.PI);
      ctx.fill();
      ctx.stroke();
      ctx.closePath();
      ctx.beginPath();
      ctx.arc(offset, this.RADIUS, this.RADIUS - 2, 0, 2 * Math.PI);
      ctx.fill();
      ctx.stroke();
      ctx.closePath();
    }
    for (let i = 0; i < colors.length; ++i) {
      for (let j = 0; j < colors.length; ++j) {
        const offset_x = (j + 1) * this.RADIUS * 2 + (j + 1) + this.RADIUS;
        const offset_y = (i + 1) * this.RADIUS * 2 + (i + 1) + this.RADIUS;
        ctx.fillStyle = colors[compute_color(i, j)];
        ctx.strokeStyle = "black";
        ctx.beginPath();
        ctx.arc(offset_x, offset_y, this.RADIUS - 2, 0, 2 * Math.PI);
        ctx.fill();
        ctx.stroke();
        ctx.closePath();
      }
    }
  }
}
