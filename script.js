var config = {
  type: Phaser.AUTO,
  width: 800,
  height: 600,
  physics: {
    default: "arcade",
    arcade: {
      debug: false,
    },
  },
  // Specifies the name of the functions that should be called.
  scene: {
    preload: preload,
    create: create,
    update: update,
  },
};

var game = new Phaser.Game(config);

function preload() {
  this.load.image("sky", "assets/sky.png");
  this.load.image("ground", "assets/platform.png");
  this.load.image("star", "assets/star.png");
  this.load.image("bomb", "assets/bomb.png");
  this.load.spritesheet("puyos", "assets/bubble_spritesheet.png", {
    frameWidth: 30,
    frameHeight: 30,
  });
}

function create() {
  //this.add.image(400, 300, "sky");
  this.add.sprite(400, 300, "puyos", 3);
}

function update() {}
