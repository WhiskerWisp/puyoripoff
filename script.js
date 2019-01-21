// Game-wide constants.
let secondary_puyo_orientations = ["TOP", "RIGHT", "BOTTOM", "LEFT"];
const number_of_columns = 6;
const number_of_rows = 12;
const puyo_sprite_width = 30; // Square so same height.
const default_puyo_spawn_column = 2; // Third column.
const game_over_column = default_puyo_spawn_column;
const puyo_fall_velocity = 80;
const puyo_fall_high_velocity = 500;
const number_of_puyo_animation_frames = 3;
const game_over_grid_coord = [75, 15];
const puyo_rotate_key_repeat_delay = 400;

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
let rotate_clockwise = Phaser.Input.Keyboard.KeyCodes.X;
let rotate_anticlockwise = Phaser.Input.Keyboard.KeyCodes.Z;
let falling_puyo;
let falling_puyo_column;
let secondary_puyo;
let secondary_puyo_column;
let secondary_puyo_orientation_index;
let game_state = ""; // CONTROL or FALLING.
let last_left_right_pressed = 0; // To prevent overly quick repeats.
const game_state_matrix = new Array(6).fill(new Array(12).fill(null)); // Column then row.
const game_height_map = new Array(6).fill(11); // Largest index with no puyos.

const generateRandomColor = () => {
  let index = Math.floor(Math.random() * 5);
  return index * number_of_puyo_animation_frames;
};

const spawn_new_puyo = scene => {
  falling_puyo_column = default_puyo_spawn_column;
  secondary_puyo_column = default_puyo_spawn_column;
  secondary_puyo_orientation_index = 0;

  const puyo_color = generateRandomColor();
  const secondary_puyo_color = generateRandomColor();

  const new_puyo_x = compute_falling_puyo_x();
  falling_puyo = scene.physics.add.sprite(new_puyo_x, 0, "puyos", puyo_color);
  falling_puyo.color = puyo_color;
  falling_puyo.setOrigin(0, 0);
  secondary_puyo = scene.physics.add.sprite(
    new_puyo_x,
    -1 * puyo_sprite_width,
    "puyos",
    secondary_puyo_color,
  );
  secondary_puyo.color = secondary_puyo_color;
  secondary_puyo.setOrigin(0, 0);
  falling_puyo.setVelocityY(puyo_fall_velocity);
  secondary_puyo.setVelocityY(puyo_fall_velocity);
};

const compute_falling_puyo_x = () => puyo_sprite_width * falling_puyo_column;
const compute_secondary_puyo_x = () =>
  puyo_sprite_width * secondary_puyo_column;

const get_orientation = index => secondary_puyo_orientations[index];

const shift_falling_puyo = direction => {
  falling_puyo_column += direction;
  secondary_puyo_column += direction;
  falling_puyo.x = compute_falling_puyo_x();
  secondary_puyo.x = compute_secondary_puyo_x();
};

const adjust_falling_puyo_velocity = velocity => {
  falling_puyo.setVelocityY(velocity);
  secondary_puyo.setVelocityY(velocity);
};

const is_within_boundary = direction => {
  // Direction is either 1 for right or -1 for left.
  const left_puyo_column = Math.min(falling_puyo_column, secondary_puyo_column);
  const out_of_bound_left = left_puyo_column == 0 && direction == -1;

  const right_puyo_column = Math.max(
    falling_puyo_column,
    secondary_puyo_column,
  );
  const out_of_bound_right = right_puyo_column + direction == number_of_columns;

  if (out_of_bound_left || out_of_bound_right) {
    return false;
  }

  const neighbor_row = game_height_map[falling_puyo_column + direction];
  const neighbor_y = neighbor_row * puyo_sprite_width;
  if (neighbor_y < falling_puyo.y || neighbor_y < secondary_puyo.y) {
    return false;
  }

  return true;
};

const compute_puyo_rotation_orientation_index = direction => {
  // Direction is 1 for clockwise, or -1 for anticlockwise.
  // Rotation is always possible, regardless of whether
  // there are walls blocking the way. It just means that
  // it has to rotate 180 degrees.

  let destination_orientation_index =
    (secondary_puyo_orientation_index + direction) % 4;
  const destination_orientation = get_orientation(
    destination_orientation_index,
  );
  const destination_column =
    destination_orientation_index % 2 == 0
      ? falling_puyo_column
      : destination_orientation_index == 1
        ? falling_puyo_column + 1
        : falling_puyo_column - 1;

  // If secondary puyo is already at the left or right, then
  // rotating it will definitely be doable.
  if (secondary_puyo_orientation_index % 2 == 1) {
    // An odd index means LEFT or RIGHT.
    return destination_orientation_index;
  }

  // Orientation is TOP or BOTTOM. Check if destination
  // clashes with a wall.
  const clashes_with_boundary =
    destination_column < 0 || destination_column >= number_of_columns;

  let potential_wall_row = game_height_map[destination_column];
  let wall_y = potential_wall_row * puyo_sprite_width;

  // We use falling_puyo's y instead of secondary puyo's because
  // the destination location is horizontally aligned with
  // the primary puyo.
  if (falling_puyo.y > wall_y) {
    // There is a wall in the way. Make this a 180 degree rotation.
  }
};

function preload() {
  this.load.image("game_over_grid", "assets/cross.png");
  this.load.spritesheet("puyos", "assets/bubble_spritesheet.png", {
    frameWidth: puyo_sprite_width,
    frameHeight: puyo_sprite_width,
  });
}

function create() {
  cursors = this.input.keyboard.createCursorKeys();
  rotate_clockwise = this.input.keyboard.addKey(rotate_clockwise);
  rotate_anticlockwise = this.input.keyboard.addKey(rotate_anticlockwise);
  this.add.image(...game_over_grid_coord, "game_over_grid");
  game_state = "CONTROL";
  spawn_new_puyo(this);
}

const update_control = scene => {
  const current_time = new Phaser.Time.Clock(scene).now;

  // Left and right shifting.
  const okay_to_shift = current_time - last_left_right_pressed >= 100; // TODO: Remove magic number
  if (cursors.left.isDown && okay_to_shift && is_within_boundary(-1)) {
    shift_falling_puyo(-1);
    last_left_right_pressed = current_time;
  } else if (cursors.right.isDown && okay_to_shift && is_within_boundary(1)) {
    shift_falling_puyo(1);
    last_left_right_pressed = current_time;
  }

  if (cursors.down.isDown) {
    adjust_falling_puyo_velocity(puyo_fall_high_velocity);
  } else {
    adjust_falling_puyo_velocity(puyo_fall_velocity);
  }

  // Rotation.
  if (
    scene.input.keyboard.checkDown(
      rotate_clockwise,
      puyo_rotate_key_repeat_delay,
    )
  ) {
    // Check if able to rotate.
    // Do the rotation.
  } else if (
    scene.input.keyboard.checkDown(
      rotate_anticlockwise,
      puyo_rotate_key_repeat_delay,
    )
  ) {
    // Check if able to rotate.
    // Do the rotation.
  }

  // Collision detection for primary puyo.
  let destination_row = game_height_map[falling_puyo_column];
  let destination_y = destination_row * puyo_sprite_width;
  if (falling_puyo.y >= destination_y) {
    // Collision detected.
    falling_puyo.setVelocityY(0);
    falling_puyo.y = destination_y;
    game_state_matrix[falling_puyo_column][destination_row] = falling_puyo;
    game_height_map[falling_puyo_column] -= 1;
    // Check if game is lost.
    if (game_height_map[game_over_column] <= 0) {
      // TODO
    }
    game_state = "FALLING";
    falling_puyo = secondary_puyo;
    falling_puyo_column = secondary_puyo_column;
  }

  // Collision detection for secondary puyo.
  destination_row = game_height_map[secondary_puyo_column];
  destination_y = destination_row * puyo_sprite_width;
  // We force game_state to be in CONTROL to prevent double-collision from happening.
  if (game_state == "CONTROL" && secondary_puyo.y >= destination_y) {
    // Collision detected.
    secondary_puyo.setVelocityY(0);
    secondary_puyo.y = destination_y;
    game_state_matrix[secondary_puyo_column][destination_row] = secondary_puyo;
    game_height_map[secondary_puyo_column] -= 1;
    // Check if game is lost.
    if (game_height_map[game_over_column] <= 0) {
      // TODO
    }
    game_state = "FALLING";
  }
};

const update_falling = scene => {
  falling_puyo.setVelocityY(puyo_fall_high_velocity);
  // Collision detection for primary puyo.
  let destination_row = game_height_map[falling_puyo_column];
  let destination_y = destination_row * puyo_sprite_width;
  if (falling_puyo.y >= destination_y) {
    // Collision detected.
    falling_puyo.setVelocityY(0);
    falling_puyo.y = destination_y;
    game_state_matrix[falling_puyo_column][destination_row] = falling_puyo;
    game_height_map[falling_puyo_column] -= 1;
    // Check if game is lost.
    if (game_height_map[game_over_column] <= 0) {
      // TODO
    }
    game_state = "CONTROL";
    spawn_new_puyo(scene);
  }
};

function update() {
  game_state == "CONTROL" ? update_control(this) : update_falling(this);
}
