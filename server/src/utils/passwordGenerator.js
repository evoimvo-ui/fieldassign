const words = [
  'blue', 'red', 'green', 'yellow', 'fast', 'slow', 'big', 'small',
  'cat', 'dog', 'bird', 'lion', 'tree', 'flower', 'mountain', 'river',
  'sun', 'moon', 'star', 'sky', 'ship', 'car', 'plane', 'bike',
  'book', 'pen', 'desk', 'chair', 'house', 'road', 'ocean', 'beach',
  'cold', 'warm', 'soft', 'hard', 'bright', 'dark', 'wild', 'calm',
  'wind', 'rain', 'snow', 'cloud', 'leaf', 'rock', 'sand', 'gold'
];

export function generateTemporaryPassword() {
  const word1 = words[Math.floor(Math.random() * words.length)];
  const word2 = words[Math.floor(Math.random() * words.length)];
  const number = Math.floor(100 + Math.random() * 900); // 3-digit number
  const capitalized = word1.charAt(0).toUpperCase() + word1.slice(1);
  return `${capitalized}-${word2}-${number}`;
}
