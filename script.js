// Game-wide constants.
const number_of_columns = 6;
const number_of_rows = 12;
const puyo_sprite_width = 30; // Square so same height.
const default_puyo_spawn_column = 2; // Third column.
const puyo_fall_velocity = 80;
const game_over_grid_coord = [75, 15];

var config = {
  type: Phaser.AUTO,
  width: puyo_sprite_width * number_of_columns,
  height: puyo_sprite_width * number_of_rows,
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

// Game-specific dynamic variables.
const game = new Phaser.Game(config);
let cursors;
let falling_puyo;
let falling_puyo_column;
let last_left_right_pressed = 0; // To prevent overly quick repeats.

const spawn_new_puyo = scene => {
  falling_puyo_column = default_puyo_spawn_column;
  const new_puyo_x = compute_falling_puyo_x();
  falling_puyo = scene.physics.add.sprite(new_puyo_x, 0, "puyos", 0);
  falling_puyo.setOrigin(0, 0);
  falling_puyo.setVelocityY(puyo_fall_velocity);
};

const compute_falling_puyo_x = () => puyo_sprite_width * falling_puyo_column;

const shift_falling_puyo = direction => {
  // Direction is either 1 for right or -1 for left.
  const out_of_bound_left = falling_puyo_column == 0 && direction == -1;
  const out_of_bound_right =
    falling_puyo_column + direction == number_of_columns;
  if (out_of_bound_left || out_of_bound_right) {
    return;
  }
  falling_puyo_column += direction;
  falling_puyo.x = compute_falling_puyo_x();
};

function preload() {
  this.load.image('game_over_grid', 'assets/cross.png');
  this.load.spritesheet("puyos", "assets/bubble_spritesheet.png", {
    frameWidth: puyo_sprite_width,
    frameHeight: puyo_sprite_width,
  });
}

function create() {
  cursors = this.input.keyboard.createCursorKeys();
  this.add.image(...game_over_grid_coord, 'game_over_grid');
  spawn_new_puyo(this);
}

function update() {
  const current_time = new Phaser.Time.Clock(this).now;

  const okay_to_shift = current_time - last_left_right_pressed >= 100; // TODO: Remove magic number
  if (cursors.left.isDown && okay_to_shift) {
    shift_falling_puyo(-1);
    last_left_right_pressed = current_time;
  } else if (cursors.right.isDown && okay_to_shift) {
    shift_falling_puyo(1);
    last_left_right_pressed = current_time;
  }
}
