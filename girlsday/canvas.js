// In dieser Datei ist der Quelltext, um die Zeichenflaeche zu verwalten.
//
// In dieser Datei muessen wir nichts veraendern.

class Canvas {
  MARGIN = 20;

  constructor(id, shape_type, wall) {
    this.wall = wall;

    this.canvas = document.getElementById(id);
    this.ctx = this.canvas.getContext("2d");

    if (shape_type == "square") this.shape = new Square(this.ctx);
    if (shape_type == "rect") this.shape = new Rect(this.ctx);
    if (shape_type == "hexagon") this.shape = new Hexagon(this.ctx);
    if (shape_type == "diamond") this.shape = new Diamond(this.ctx);

    this.resize();
    window.addEventListener("resize", this.resize.bind(this));

    window.requestAnimationFrame(this.draw.bind(this));
  }

  resize() {
    this.width = window.innerWidth;
    this.height = window.innerHeight;
    this.canvas.width = this.width;
    this.canvas.height = this.height;
    this.draw();
  }

  draw() {
    // Compute actual drawing dimensions.
    const w = this.width - 2 * this.MARGIN;
    const h = this.height - 2 * this.MARGIN;

    // Compute the size of each shape.
    // To avoid drawing between pixels, make dim an even number.
    const w_brick = Math.floor(w / this.wall.size);
    const h_brick = Math.floor(h / (this.wall.size * this.shape.HW_RATIO));
    const dim = Math.min(w_brick, h_brick) & ~1;

    // Draw row by row.
    let x_offset = this.MARGIN;
    for (let i = 0; i < this.wall.size; ++i) {
      for (let j = 0; j + i < this.wall.size; ++j) {
        let x = x_offset + j * dim ;
        let y = this.MARGIN + i * dim * this.shape.HW_RATIO;
        this.shape.draw(x, y, dim,
            this.wall.colors[this.wall.get_displayed_color(i, j)]);
      }

      x_offset += dim / 2;
    }

    if (this.wall.queue.length != 0) {
      this.wall.work();
      window.setTimeout(this.draw.bind(this), this.wall.delay);
    }
  }
}
