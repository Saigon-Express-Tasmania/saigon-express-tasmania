export type AllergenKey =
  | "gluten"
  | "nuts"
  | "dairy"
  | "egg"
  | "soy"
  | "fish"
  | "crustacean"
  | "sesame";

export type NutritionDish = {
  name: string;
  category: string;
  veg: boolean;
  vegan: boolean;
  halal: boolean;
  allergens: AllergenKey[];
};

export const NUTRITION_DISHES: NutritionDish[] = [
  {
    "name": "5x Seafood Spring Rolls",
    "category": "Entree",
    "veg": false,
    "vegan": false,
    "halal": false,
    "allergens": [
      "gluten",
      "egg",
      "soy",
      "fish",
      "crustacean",
      "sesame"
    ]
  },
  {
    "name": "4x Vegetable Spring Rolls",
    "category": "Entree",
    "veg": true,
    "vegan": true,
    "halal": false,
    "allergens": [
      "gluten",
      "soy",
      "sesame"
    ]
  },
  {
    "name": "4x Prawn Toast",
    "category": "Entree",
    "veg": false,
    "vegan": false,
    "halal": false,
    "allergens": [
      "gluten",
      "egg",
      "crustacean",
      "sesame"
    ]
  },
  {
    "name": "Mixed Entree",
    "category": "Entree",
    "veg": false,
    "vegan": false,
    "halal": false,
    "allergens": [
      "gluten",
      "egg",
      "soy",
      "fish",
      "crustacean",
      "sesame"
    ]
  },
  {
    "name": "Prawn Crackers",
    "category": "Entree",
    "veg": false,
    "vegan": false,
    "halal": false,
    "allergens": [
      "crustacean"
    ]
  },
  {
    "name": "Satay Chicken Skewer",
    "category": "Entree",
    "veg": false,
    "vegan": false,
    "halal": true,
    "allergens": [
      "nuts",
      "soy",
      "sesame"
    ]
  },
  {
    "name": "4x Steam or Fried Dumplings",
    "category": "Entree",
    "veg": false,
    "vegan": false,
    "halal": false,
    "allergens": [
      "gluten",
      "egg",
      "soy",
      "sesame"
    ]
  },
  {
    "name": "Crackling Roasted Pork (Small)",
    "category": "Entree",
    "veg": false,
    "vegan": false,
    "halal": false,
    "allergens": [
      "soy",
      "sesame"
    ]
  },
  {
    "name": "3x Viet Style Crispy Chicken Wings",
    "category": "Entree",
    "veg": false,
    "vegan": false,
    "halal": false,
    "allergens": [
      "fish",
      "sesame"
    ]
  },
  {
    "name": "Steamed Rice",
    "category": "Entree",
    "veg": true,
    "vegan": true,
    "halal": true,
    "allergens": []
  },
  {
    "name": "Coconut Rice",
    "category": "Entree",
    "veg": true,
    "vegan": true,
    "halal": true,
    "allergens": []
  },
  {
    "name": "2x Char Siu BBQ Pork Rolls",
    "category": "Cuon - Rice Paper Rolls",
    "veg": false,
    "vegan": false,
    "halal": false,
    "allergens": [
      "gluten",
      "soy",
      "sesame"
    ]
  },
  {
    "name": "2x Crispy Roast Pork Rolls",
    "category": "Cuon - Rice Paper Rolls",
    "veg": false,
    "vegan": false,
    "halal": false,
    "allergens": [
      "soy",
      "sesame"
    ]
  },
  {
    "name": "2x Roast Duck Rolls",
    "category": "Cuon - Rice Paper Rolls",
    "veg": false,
    "vegan": false,
    "halal": true,
    "allergens": [
      "gluten",
      "soy",
      "sesame"
    ]
  },
  {
    "name": "2x Crispy Tofu Rolls",
    "category": "Cuon - Rice Paper Rolls",
    "veg": true,
    "vegan": true,
    "halal": true,
    "allergens": [
      "gluten",
      "soy",
      "sesame"
    ]
  },
  {
    "name": "2x Chicken Rolls",
    "category": "Cuon - Rice Paper Rolls",
    "veg": false,
    "vegan": false,
    "halal": true,
    "allergens": [
      "soy",
      "sesame"
    ]
  },
  {
    "name": "2x Prawn Rolls",
    "category": "Cuon - Rice Paper Rolls",
    "veg": false,
    "vegan": false,
    "halal": true,
    "allergens": [
      "crustacean",
      "fish",
      "sesame"
    ]
  },
  {
    "name": "2x Chicken & Avo Rolls",
    "category": "Cuon - Rice Paper Rolls",
    "veg": false,
    "vegan": false,
    "halal": true,
    "allergens": [
      "soy",
      "sesame"
    ]
  },
  {
    "name": "2x Chicken & Prawn Rolls",
    "category": "Cuon - Rice Paper Rolls",
    "veg": false,
    "vegan": false,
    "halal": true,
    "allergens": [
      "crustacean",
      "fish",
      "soy",
      "sesame"
    ]
  },
  {
    "name": "Crispy Roast Pork Banh Mi",
    "category": "Banh Mi",
    "veg": false,
    "vegan": false,
    "halal": false,
    "allergens": [
      "gluten",
      "nuts",
      "dairy",
      "egg",
      "soy",
      "sesame"
    ]
  },
  {
    "name": "Country Fried Chicken Banh Mi",
    "category": "Banh Mi",
    "veg": false,
    "vegan": false,
    "halal": false,
    "allergens": [
      "gluten",
      "nuts",
      "dairy",
      "egg",
      "soy",
      "sesame"
    ]
  },
  {
    "name": "Lemongrass Beef Banh Mi",
    "category": "Banh Mi",
    "veg": false,
    "vegan": false,
    "halal": true,
    "allergens": [
      "gluten",
      "nuts",
      "dairy",
      "egg",
      "soy",
      "sesame"
    ]
  },
  {
    "name": "Lemongrass Chicken Banh Mi",
    "category": "Banh Mi",
    "veg": false,
    "vegan": false,
    "halal": true,
    "allergens": [
      "gluten",
      "nuts",
      "dairy",
      "egg",
      "soy",
      "sesame"
    ]
  },
  {
    "name": "Grilled Pork Banh Mi",
    "category": "Banh Mi",
    "veg": false,
    "vegan": false,
    "halal": false,
    "allergens": [
      "gluten",
      "nuts",
      "dairy",
      "egg",
      "soy",
      "sesame"
    ]
  },
  {
    "name": "Char Siu BBQ Pork Banh Mi",
    "category": "Banh Mi",
    "veg": false,
    "vegan": false,
    "halal": false,
    "allergens": [
      "gluten",
      "nuts",
      "dairy",
      "egg",
      "soy",
      "sesame"
    ]
  },
  {
    "name": "Satay Chicken Banh Mi",
    "category": "Banh Mi",
    "veg": false,
    "vegan": false,
    "halal": true,
    "allergens": [
      "gluten",
      "nuts",
      "dairy",
      "egg",
      "soy",
      "sesame"
    ]
  },
  {
    "name": "Roast Duck Banh Mi",
    "category": "Banh Mi",
    "veg": false,
    "vegan": false,
    "halal": true,
    "allergens": [
      "gluten",
      "nuts",
      "dairy",
      "egg",
      "soy",
      "sesame"
    ]
  },
  {
    "name": "Crispy Squid Banh Mi",
    "category": "Banh Mi",
    "veg": false,
    "vegan": false,
    "halal": false,
    "allergens": [
      "gluten",
      "nuts",
      "dairy",
      "egg",
      "soy",
      "fish",
      "crustacean",
      "sesame"
    ]
  },
  {
    "name": "Veggie & Tofu Banh Mi",
    "category": "Banh Mi",
    "veg": true,
    "vegan": false,
    "halal": true,
    "allergens": [
      "gluten",
      "nuts",
      "dairy",
      "egg",
      "soy",
      "sesame"
    ]
  },
  {
    "name": "Salt & Pepper Tofu Banh Mi",
    "category": "Banh Mi",
    "veg": true,
    "vegan": false,
    "halal": true,
    "allergens": [
      "gluten",
      "nuts",
      "dairy",
      "egg",
      "soy",
      "sesame"
    ]
  },
  {
    "name": "Basil Mushroom Tofu Banh Mi",
    "category": "Banh Mi",
    "veg": true,
    "vegan": false,
    "halal": true,
    "allergens": [
      "gluten",
      "nuts",
      "dairy",
      "egg",
      "soy",
      "sesame"
    ]
  },
  {
    "name": "Sliced Rare Beef Pho",
    "category": "Pho",
    "veg": false,
    "vegan": false,
    "halal": false,
    "allergens": [
      "soy",
      "sesame"
    ]
  },
  {
    "name": "Chicken Pho",
    "category": "Pho",
    "veg": false,
    "vegan": false,
    "halal": false,
    "allergens": [
      "soy",
      "sesame"
    ]
  },
  {
    "name": "Beef Combination Pho",
    "category": "Pho",
    "veg": false,
    "vegan": false,
    "halal": false,
    "allergens": [
      "soy",
      "sesame"
    ]
  },
  {
    "name": "Chicken & Beef Pho",
    "category": "Pho",
    "veg": false,
    "vegan": false,
    "halal": false,
    "allergens": [
      "soy",
      "sesame"
    ]
  },
  {
    "name": "Veggie & Tofu Pho",
    "category": "Pho",
    "veg": true,
    "vegan": true,
    "halal": true,
    "allergens": [
      "soy",
      "sesame"
    ]
  },
  {
    "name": "Prawn Pho",
    "category": "Pho",
    "veg": false,
    "vegan": false,
    "halal": false,
    "allergens": [
      "crustacean",
      "fish",
      "soy",
      "sesame"
    ]
  },
  {
    "name": "Crispy Roast Pork Pho",
    "category": "Pho",
    "veg": false,
    "vegan": false,
    "halal": false,
    "allergens": [
      "soy",
      "sesame"
    ]
  },
  {
    "name": "Rare Beef & Tendon Pho",
    "category": "Pho",
    "veg": false,
    "vegan": false,
    "halal": false,
    "allergens": [
      "soy",
      "sesame"
    ]
  },
  {
    "name": "Grilled Pork & Spring Roll Bun",
    "category": "Bun - Noodle Salad",
    "veg": false,
    "vegan": false,
    "halal": false,
    "allergens": [
      "gluten",
      "nuts",
      "soy",
      "fish",
      "sesame"
    ]
  },
  {
    "name": "Crispy Roast Pork Bun",
    "category": "Bun - Noodle Salad",
    "veg": false,
    "vegan": false,
    "halal": false,
    "allergens": [
      "nuts",
      "soy",
      "fish",
      "sesame"
    ]
  },
  {
    "name": "Grilled Prawn Bun",
    "category": "Bun - Noodle Salad",
    "veg": false,
    "vegan": false,
    "halal": false,
    "allergens": [
      "nuts",
      "crustacean",
      "fish",
      "sesame"
    ]
  },
  {
    "name": "Lemongrass Chicken Bun",
    "category": "Bun - Noodle Salad",
    "veg": false,
    "vegan": false,
    "halal": true,
    "allergens": [
      "nuts",
      "soy",
      "fish",
      "sesame"
    ]
  },
  {
    "name": "Lemongrass Beef Bun",
    "category": "Bun - Noodle Salad",
    "veg": false,
    "vegan": false,
    "halal": false,
    "allergens": [
      "nuts",
      "soy",
      "fish",
      "sesame"
    ]
  },
  {
    "name": "Satay Chicken Bun",
    "category": "Bun - Noodle Salad",
    "veg": false,
    "vegan": false,
    "halal": true,
    "allergens": [
      "nuts",
      "soy",
      "fish",
      "sesame"
    ]
  },
  {
    "name": "Country Fried Chicken Bun",
    "category": "Bun - Noodle Salad",
    "veg": false,
    "vegan": false,
    "halal": false,
    "allergens": [
      "gluten",
      "nuts",
      "egg",
      "soy",
      "fish",
      "sesame"
    ]
  },
  {
    "name": "Tofu & Veggie Spring Roll Bun",
    "category": "Bun - Noodle Salad",
    "veg": true,
    "vegan": false,
    "halal": false,
    "allergens": [
      "gluten",
      "nuts",
      "soy",
      "fish",
      "sesame"
    ]
  },
  {
    "name": "Basil Mushroom Tofu Bun",
    "category": "Bun - Noodle Salad",
    "veg": true,
    "vegan": false,
    "halal": true,
    "allergens": [
      "nuts",
      "soy",
      "fish",
      "sesame"
    ]
  },
  {
    "name": "Sliced Rare Beef Salad",
    "category": "Goi - Salad",
    "veg": false,
    "vegan": false,
    "halal": false,
    "allergens": [
      "nuts",
      "fish",
      "sesame"
    ]
  },
  {
    "name": "Crispy Roast Pork Salad",
    "category": "Goi - Salad",
    "veg": false,
    "vegan": false,
    "halal": false,
    "allergens": [
      "nuts",
      "fish",
      "sesame"
    ]
  },
  {
    "name": "Sliced Chicken Salad",
    "category": "Goi - Salad",
    "veg": false,
    "vegan": false,
    "halal": true,
    "allergens": [
      "nuts",
      "fish",
      "sesame"
    ]
  },
  {
    "name": "Veggie & Tofu Salad",
    "category": "Goi - Salad",
    "veg": true,
    "vegan": false,
    "halal": true,
    "allergens": [
      "nuts",
      "fish",
      "soy",
      "sesame"
    ]
  },
  {
    "name": "Chicken & Prawn Salad",
    "category": "Goi - Salad",
    "veg": false,
    "vegan": false,
    "halal": false,
    "allergens": [
      "nuts",
      "crustacean",
      "fish",
      "sesame"
    ]
  },
  {
    "name": "Combination Salad",
    "category": "Goi - Salad",
    "veg": false,
    "vegan": false,
    "halal": false,
    "allergens": [
      "nuts",
      "crustacean",
      "fish",
      "sesame"
    ]
  },
  {
    "name": "Crispy Squid Salad",
    "category": "Goi - Salad",
    "veg": false,
    "vegan": false,
    "halal": false,
    "allergens": [
      "gluten",
      "nuts",
      "egg",
      "fish",
      "crustacean",
      "sesame"
    ]
  },
  {
    "name": "Grilled Pork with Fried Egg Rice",
    "category": "Com - Viet Rice",
    "veg": false,
    "vegan": false,
    "halal": false,
    "allergens": [
      "egg",
      "soy",
      "sesame"
    ]
  },
  {
    "name": "BBQ Pork Char Siu Rice",
    "category": "Com - Viet Rice",
    "veg": false,
    "vegan": false,
    "halal": false,
    "allergens": [
      "gluten",
      "soy",
      "sesame"
    ]
  },
  {
    "name": "Lemongrass & Chilli Chicken Rice",
    "category": "Com - Viet Rice",
    "veg": false,
    "vegan": false,
    "halal": true,
    "allergens": [
      "soy",
      "sesame"
    ]
  },
  {
    "name": "Lemongrass & Chilli Beef Rice",
    "category": "Com - Viet Rice",
    "veg": false,
    "vegan": false,
    "halal": false,
    "allergens": [
      "soy",
      "sesame"
    ]
  },
  {
    "name": "Crispy Roast Pork & BBQ Pork Rice",
    "category": "Com - Viet Rice",
    "veg": false,
    "vegan": false,
    "halal": false,
    "allergens": [
      "gluten",
      "soy",
      "sesame"
    ]
  },
  {
    "name": "Combination Rice",
    "category": "Com - Viet Rice",
    "veg": false,
    "vegan": false,
    "halal": false,
    "allergens": [
      "gluten",
      "soy",
      "fish",
      "sesame"
    ]
  },
  {
    "name": "Satay Beef Rice",
    "category": "Com - Viet Rice",
    "veg": false,
    "vegan": false,
    "halal": false,
    "allergens": [
      "nuts",
      "soy",
      "sesame"
    ]
  },
  {
    "name": "Satay Chicken Rice",
    "category": "Com - Viet Rice",
    "veg": false,
    "vegan": false,
    "halal": true,
    "allergens": [
      "nuts",
      "soy",
      "sesame"
    ]
  },
  {
    "name": "Crispy Roast Pork Rice",
    "category": "Com - Viet Rice",
    "veg": false,
    "vegan": false,
    "halal": false,
    "allergens": [
      "soy",
      "sesame"
    ]
  },
  {
    "name": "Seafood Rice",
    "category": "Com - Viet Rice",
    "veg": false,
    "vegan": false,
    "halal": false,
    "allergens": [
      "crustacean",
      "fish",
      "soy",
      "sesame"
    ]
  },
  {
    "name": "Veggie & Tofu Rice",
    "category": "Com - Viet Rice",
    "veg": true,
    "vegan": false,
    "halal": true,
    "allergens": [
      "gluten",
      "soy",
      "sesame"
    ]
  },
  {
    "name": "Roast Duck Rice",
    "category": "Com - Viet Rice",
    "veg": false,
    "vegan": false,
    "halal": true,
    "allergens": [
      "soy",
      "sesame"
    ]
  },
  {
    "name": "Spicy Beef Combination BBH",
    "category": "Bun Bo Hue",
    "veg": false,
    "vegan": false,
    "halal": false,
    "allergens": [
      "fish",
      "crustacean",
      "soy",
      "sesame"
    ]
  },
  {
    "name": "Spicy Chicken BBH",
    "category": "Bun Bo Hue",
    "veg": false,
    "vegan": false,
    "halal": false,
    "allergens": [
      "fish",
      "crustacean",
      "soy",
      "sesame"
    ]
  },
  {
    "name": "Spicy Crispy Roast Pork BBH",
    "category": "Bun Bo Hue",
    "veg": false,
    "vegan": false,
    "halal": false,
    "allergens": [
      "fish",
      "crustacean",
      "soy",
      "sesame"
    ]
  },
  {
    "name": "Spicy Roast Duck BBH",
    "category": "Bun Bo Hue",
    "veg": false,
    "vegan": false,
    "halal": false,
    "allergens": [
      "fish",
      "crustacean",
      "soy",
      "sesame"
    ]
  },
  {
    "name": "Spicy Grilled Pork BBH",
    "category": "Bun Bo Hue",
    "veg": false,
    "vegan": false,
    "halal": false,
    "allergens": [
      "fish",
      "crustacean",
      "soy",
      "sesame"
    ]
  },
  {
    "name": "Spicy Seafood BBH",
    "category": "Bun Bo Hue",
    "veg": false,
    "vegan": false,
    "halal": false,
    "allergens": [
      "fish",
      "crustacean",
      "soy",
      "sesame"
    ]
  },
  {
    "name": "Spicy Veggie & Tofu BBH",
    "category": "Bun Bo Hue",
    "veg": true,
    "vegan": false,
    "halal": false,
    "allergens": [
      "fish",
      "soy",
      "sesame"
    ]
  },
  {
    "name": "Crispy Roast Pork Fried Rice",
    "category": "Com Chien - Fried Rice",
    "veg": false,
    "vegan": false,
    "halal": false,
    "allergens": [
      "egg",
      "soy",
      "sesame"
    ]
  },
  {
    "name": "Crispy Fried Chicken Fried Rice",
    "category": "Com Chien - Fried Rice",
    "veg": false,
    "vegan": false,
    "halal": false,
    "allergens": [
      "gluten",
      "egg",
      "soy",
      "sesame"
    ]
  },
  {
    "name": "Saigon Express Fried Rice",
    "category": "Com Chien - Fried Rice",
    "veg": false,
    "vegan": false,
    "halal": false,
    "allergens": [
      "egg",
      "crustacean",
      "fish",
      "soy",
      "sesame"
    ]
  },
  {
    "name": "Veggie & Tofu Fried Rice",
    "category": "Com Chien - Fried Rice",
    "veg": true,
    "vegan": false,
    "halal": false,
    "allergens": [
      "egg",
      "soy",
      "sesame"
    ]
  },
  {
    "name": "Chicken Fried Rice",
    "category": "Com Chien - Fried Rice",
    "veg": false,
    "vegan": false,
    "halal": true,
    "allergens": [
      "egg",
      "soy",
      "sesame"
    ]
  },
  {
    "name": "Chicken & Prawn Fried Rice",
    "category": "Com Chien - Fried Rice",
    "veg": false,
    "vegan": false,
    "halal": false,
    "allergens": [
      "egg",
      "crustacean",
      "fish",
      "soy",
      "sesame"
    ]
  },
  {
    "name": "Seafood Fried Rice",
    "category": "Com Chien - Fried Rice",
    "veg": false,
    "vegan": false,
    "halal": false,
    "allergens": [
      "egg",
      "crustacean",
      "fish",
      "soy",
      "sesame"
    ]
  },
  {
    "name": "Nasi Goreng Fried Rice",
    "category": "Com Chien - Fried Rice",
    "veg": false,
    "vegan": false,
    "halal": false,
    "allergens": [
      "egg",
      "crustacean",
      "fish",
      "nuts",
      "soy",
      "sesame"
    ]
  },
  {
    "name": "Tom Yum Fried Rice",
    "category": "Com Chien - Fried Rice",
    "veg": false,
    "vegan": false,
    "halal": false,
    "allergens": [
      "crustacean",
      "fish",
      "soy",
      "sesame"
    ]
  },
  {
    "name": "Egg Fried Rice (Small)",
    "category": "Com Chien - Fried Rice",
    "veg": true,
    "vegan": false,
    "halal": true,
    "allergens": [
      "egg",
      "soy",
      "sesame"
    ]
  },
  {
    "name": "Chicken Sweet Corn Soup",
    "category": "Soup",
    "veg": false,
    "vegan": false,
    "halal": true,
    "allergens": [
      "egg",
      "soy"
    ]
  },
  {
    "name": "Seafood Tom Yum Soup",
    "category": "Soup",
    "veg": false,
    "vegan": false,
    "halal": false,
    "allergens": [
      "crustacean",
      "fish",
      "soy"
    ]
  },
  {
    "name": "Fresh Sliced Beef Soup",
    "category": "Soup",
    "veg": false,
    "vegan": false,
    "halal": false,
    "allergens": [
      "soy"
    ]
  },
  {
    "name": "Sliced Chicken Soup",
    "category": "Soup",
    "veg": false,
    "vegan": false,
    "halal": true,
    "allergens": [
      "soy"
    ]
  },
  {
    "name": "Combination Soup",
    "category": "Soup",
    "veg": false,
    "vegan": false,
    "halal": false,
    "allergens": [
      "crustacean",
      "fish",
      "soy"
    ]
  },
  {
    "name": "Veggie & Tofu Soup",
    "category": "Soup",
    "veg": true,
    "vegan": true,
    "halal": true,
    "allergens": [
      "soy"
    ]
  },
  {
    "name": "Classic Banh Xeo (Chicken & Prawn)",
    "category": "Banh Xeo - Pancake",
    "veg": false,
    "vegan": false,
    "halal": false,
    "allergens": [
      "egg",
      "crustacean",
      "fish",
      "soy"
    ]
  },
  {
    "name": "Char Siu BBQ Pork Banh Xeo",
    "category": "Banh Xeo - Pancake",
    "veg": false,
    "vegan": false,
    "halal": false,
    "allergens": [
      "gluten",
      "soy"
    ]
  },
  {
    "name": "Veggie & Tofu Banh Xeo",
    "category": "Banh Xeo - Pancake",
    "veg": true,
    "vegan": false,
    "halal": true,
    "allergens": [
      "soy"
    ]
  },
  {
    "name": "Seafood Banh Xeo (Squid & Prawn)",
    "category": "Banh Xeo - Pancake",
    "veg": false,
    "vegan": false,
    "halal": false,
    "allergens": [
      "crustacean",
      "fish",
      "soy"
    ]
  },
  {
    "name": "Chicken Banh Xeo",
    "category": "Banh Xeo - Pancake",
    "veg": false,
    "vegan": false,
    "halal": true,
    "allergens": [
      "soy"
    ]
  },
  {
    "name": "Beef Banh Xeo",
    "category": "Banh Xeo - Pancake",
    "veg": false,
    "vegan": false,
    "halal": false,
    "allergens": [
      "soy"
    ]
  },
  {
    "name": "Combination Banh Xeo",
    "category": "Banh Xeo - Pancake",
    "veg": false,
    "vegan": false,
    "halal": false,
    "allergens": [
      "crustacean",
      "fish",
      "soy"
    ]
  },
  {
    "name": "Pho Lunch Meal (coffee + pho)",
    "category": "Viet Meal Deal",
    "veg": false,
    "vegan": false,
    "halal": false,
    "allergens": [
      "dairy",
      "soy",
      "sesame"
    ]
  },
  {
    "name": "Bread & Rolls Meal (baguette + 2 rolls)",
    "category": "Viet Meal Deal",
    "veg": false,
    "vegan": false,
    "halal": false,
    "allergens": [
      "gluten",
      "nuts",
      "dairy",
      "egg",
      "soy",
      "sesame"
    ]
  },
  {
    "name": "Banh Mi Lunch Meal (coffee + banh mi)",
    "category": "Viet Meal Deal",
    "veg": false,
    "vegan": false,
    "halal": false,
    "allergens": [
      "gluten",
      "nuts",
      "dairy",
      "egg",
      "soy",
      "sesame"
    ]
  },
  {
    "name": "Special Combo (banh mi + pho)",
    "category": "Viet Meal Deal",
    "veg": false,
    "vegan": false,
    "halal": false,
    "allergens": [
      "gluten",
      "nuts",
      "dairy",
      "egg",
      "soy",
      "sesame"
    ]
  },
  {
    "name": "Saigon Express Special (pho + 2 rolls)",
    "category": "Viet Meal Deal",
    "veg": false,
    "vegan": false,
    "halal": false,
    "allergens": [
      "gluten",
      "soy",
      "sesame"
    ]
  },
  {
    "name": "Honey/Sweet&Sour Pork in Batter",
    "category": "Main Dish - No Rice",
    "veg": false,
    "vegan": false,
    "halal": false,
    "allergens": [
      "gluten",
      "egg",
      "soy",
      "sesame"
    ]
  },
  {
    "name": "Honey/Sweet&Sour Combination in Batter",
    "category": "Main Dish - No Rice",
    "veg": false,
    "vegan": false,
    "halal": false,
    "allergens": [
      "gluten",
      "egg",
      "crustacean",
      "fish",
      "soy",
      "sesame"
    ]
  },
  {
    "name": "Honey/Sweet&Sour Prawn in Batter",
    "category": "Main Dish - No Rice",
    "veg": false,
    "vegan": false,
    "halal": false,
    "allergens": [
      "gluten",
      "egg",
      "crustacean",
      "fish",
      "sesame"
    ]
  },
  {
    "name": "Honey/Sweet&Sour Chicken in Batter",
    "category": "Main Dish - No Rice",
    "veg": false,
    "vegan": false,
    "halal": true,
    "allergens": [
      "gluten",
      "egg",
      "soy",
      "sesame"
    ]
  },
  {
    "name": "Honey/Sweet&Sour Tofu in Batter",
    "category": "Main Dish - No Rice",
    "veg": true,
    "vegan": false,
    "halal": true,
    "allergens": [
      "gluten",
      "egg",
      "soy",
      "sesame"
    ]
  },
  {
    "name": "Broccoli in Oyster/Garlic Sauce",
    "category": "Main Dish - No Rice",
    "veg": true,
    "vegan": false,
    "halal": true,
    "allergens": [
      "gluten",
      "soy",
      "fish"
    ]
  },
  {
    "name": "Mixed Vegetables in Oyster/Garlic Sauce",
    "category": "Main Dish - No Rice",
    "veg": true,
    "vegan": false,
    "halal": true,
    "allergens": [
      "gluten",
      "soy",
      "fish"
    ]
  },
  {
    "name": "Bok Choy in Oyster/Garlic Sauce",
    "category": "Main Dish - No Rice",
    "veg": true,
    "vegan": false,
    "halal": true,
    "allergens": [
      "gluten",
      "soy",
      "fish"
    ]
  },
  {
    "name": "Hot Plate Chicken (choice of sauce)",
    "category": "Main Dish - No Rice",
    "veg": false,
    "vegan": false,
    "halal": true,
    "allergens": [
      "gluten",
      "nuts",
      "soy",
      "fish",
      "sesame"
    ]
  },
  {
    "name": "Hot Plate Beef (choice of sauce)",
    "category": "Main Dish - No Rice",
    "veg": false,
    "vegan": false,
    "halal": false,
    "allergens": [
      "gluten",
      "nuts",
      "soy",
      "fish",
      "sesame"
    ]
  },
  {
    "name": "Hot Plate Prawn (choice of sauce)",
    "category": "Main Dish - No Rice",
    "veg": false,
    "vegan": false,
    "halal": false,
    "allergens": [
      "gluten",
      "nuts",
      "crustacean",
      "fish",
      "soy",
      "sesame"
    ]
  },
  {
    "name": "Hot Plate Seafood/Duck (choice of sauce)",
    "category": "Main Dish - No Rice",
    "veg": false,
    "vegan": false,
    "halal": false,
    "allergens": [
      "gluten",
      "nuts",
      "crustacean",
      "fish",
      "soy",
      "sesame"
    ]
  },
  {
    "name": "Hot Plate Combination (choice of sauce)",
    "category": "Main Dish - No Rice",
    "veg": false,
    "vegan": false,
    "halal": false,
    "allergens": [
      "gluten",
      "nuts",
      "crustacean",
      "fish",
      "soy",
      "sesame"
    ]
  },
  {
    "name": "Hot Plate Veges & Tofu (choice of sauce)",
    "category": "Main Dish - No Rice",
    "veg": true,
    "vegan": false,
    "halal": true,
    "allergens": [
      "gluten",
      "nuts",
      "soy",
      "fish",
      "sesame"
    ]
  },
  {
    "name": "Salt & Pepper Tofu",
    "category": "Chef's Suggestions",
    "veg": true,
    "vegan": true,
    "halal": true,
    "allergens": [
      "gluten",
      "soy",
      "sesame"
    ]
  },
  {
    "name": "Salt & Pepper Squid",
    "category": "Chef's Suggestions",
    "veg": false,
    "vegan": false,
    "halal": false,
    "allergens": [
      "gluten",
      "egg",
      "fish",
      "crustacean",
      "sesame"
    ]
  },
  {
    "name": "Honey Prawn",
    "category": "Chef's Suggestions",
    "veg": false,
    "vegan": false,
    "halal": false,
    "allergens": [
      "gluten",
      "egg",
      "crustacean",
      "fish",
      "sesame"
    ]
  },
  {
    "name": "Combination Bird Nest",
    "category": "Chef's Suggestions",
    "veg": false,
    "vegan": false,
    "halal": false,
    "allergens": [
      "gluten",
      "egg",
      "crustacean",
      "fish",
      "soy",
      "sesame"
    ]
  },
  {
    "name": "Seafood Bird Nest",
    "category": "Chef's Suggestions",
    "veg": false,
    "vegan": false,
    "halal": false,
    "allergens": [
      "gluten",
      "egg",
      "crustacean",
      "fish",
      "soy",
      "sesame"
    ]
  },
  {
    "name": "Honey Chicken",
    "category": "Chef's Suggestions",
    "veg": false,
    "vegan": false,
    "halal": true,
    "allergens": [
      "gluten",
      "egg",
      "soy",
      "sesame"
    ]
  },
  {
    "name": "Mongolian Beef",
    "category": "Chef's Suggestions",
    "veg": false,
    "vegan": false,
    "halal": false,
    "allergens": [
      "gluten",
      "soy",
      "sesame"
    ]
  },
  {
    "name": "Sizzling Garlic Prawn",
    "category": "Chef's Suggestions",
    "veg": false,
    "vegan": false,
    "halal": false,
    "allergens": [
      "gluten",
      "crustacean",
      "fish",
      "soy",
      "sesame"
    ]
  },
  {
    "name": "Lemongrass Chilli Chicken",
    "category": "Chef's Suggestions",
    "veg": false,
    "vegan": false,
    "halal": true,
    "allergens": [
      "gluten",
      "soy",
      "sesame"
    ]
  },
  {
    "name": "Satay Chicken (Chef)",
    "category": "Chef's Suggestions",
    "veg": false,
    "vegan": false,
    "halal": true,
    "allergens": [
      "nuts",
      "soy",
      "sesame"
    ]
  },
  {
    "name": "Vietnamese Beef Basil",
    "category": "Chef's Suggestions",
    "veg": false,
    "vegan": false,
    "halal": false,
    "allergens": [
      "gluten",
      "soy",
      "fish",
      "sesame"
    ]
  },
  {
    "name": "Salt & Pepper Prawn",
    "category": "Chef's Suggestions",
    "veg": false,
    "vegan": false,
    "halal": false,
    "allergens": [
      "gluten",
      "egg",
      "crustacean",
      "fish",
      "sesame"
    ]
  },
  {
    "name": "Seafood Hot Plate",
    "category": "Chef's Suggestions",
    "veg": false,
    "vegan": false,
    "halal": false,
    "allergens": [
      "gluten",
      "crustacean",
      "fish",
      "soy",
      "sesame"
    ]
  },
  {
    "name": "Cashew Chicken",
    "category": "Chef's Suggestions",
    "veg": false,
    "vegan": false,
    "halal": true,
    "allergens": [
      "nuts",
      "soy",
      "sesame"
    ]
  },
  {
    "name": "Stir Fried Mix Vegetable",
    "category": "Chef's Suggestions",
    "veg": true,
    "vegan": true,
    "halal": true,
    "allergens": [
      "gluten",
      "soy",
      "fish"
    ]
  },
  {
    "name": "Vietnamese Prawn Green Curry",
    "category": "Chef's Suggestions",
    "veg": false,
    "vegan": false,
    "halal": false,
    "allergens": [
      "crustacean",
      "fish",
      "nuts",
      "sesame"
    ]
  },
  {
    "name": "Sweet & Sour Pork (Chef)",
    "category": "Chef's Suggestions",
    "veg": false,
    "vegan": false,
    "halal": false,
    "allergens": [
      "gluten",
      "egg",
      "soy",
      "sesame"
    ]
  },
  {
    "name": "Prawn in Tamarind Sauce",
    "category": "Chef's Suggestions",
    "veg": false,
    "vegan": false,
    "halal": false,
    "allergens": [
      "crustacean",
      "fish",
      "soy",
      "sesame"
    ]
  },
  {
    "name": "Vietnamese Duck Basil",
    "category": "Chef's Suggestions",
    "veg": false,
    "vegan": false,
    "halal": true,
    "allergens": [
      "gluten",
      "soy",
      "fish",
      "sesame"
    ]
  },
  {
    "name": "Crispy Chicken Lemongrass & Soya",
    "category": "Chef's Suggestions",
    "veg": false,
    "vegan": false,
    "halal": true,
    "allergens": [
      "gluten",
      "soy",
      "sesame"
    ]
  },
  {
    "name": "Vietnamese Roasted Duck (Half)",
    "category": "Chef's Suggestions",
    "veg": false,
    "vegan": false,
    "halal": true,
    "allergens": [
      "soy",
      "sesame"
    ]
  },
  {
    "name": "Crackling Roasted Pork (Large)",
    "category": "Chef's Suggestions",
    "veg": false,
    "vegan": false,
    "halal": false,
    "allergens": [
      "soy",
      "sesame"
    ]
  },
  {
    "name": "Stir Fried Singapore Noodle",
    "category": "Asian Noodle",
    "veg": false,
    "vegan": false,
    "halal": false,
    "allergens": [
      "gluten",
      "egg",
      "crustacean",
      "fish",
      "soy",
      "sesame"
    ]
  },
  {
    "name": "Hor Fun",
    "category": "Asian Noodle",
    "veg": false,
    "vegan": false,
    "halal": false,
    "allergens": [
      "gluten",
      "soy",
      "fish",
      "sesame"
    ]
  },
  {
    "name": "Satay Hokien Noodle",
    "category": "Asian Noodle",
    "veg": false,
    "vegan": false,
    "halal": false,
    "allergens": [
      "gluten",
      "nuts",
      "soy",
      "sesame"
    ]
  },
  {
    "name": "Mee Goreng",
    "category": "Asian Noodle",
    "veg": false,
    "vegan": false,
    "halal": false,
    "allergens": [
      "gluten",
      "egg",
      "soy",
      "fish",
      "sesame"
    ]
  },
  {
    "name": "Char Kway Teow",
    "category": "Asian Noodle",
    "veg": false,
    "vegan": false,
    "halal": false,
    "allergens": [
      "gluten",
      "egg",
      "crustacean",
      "soy",
      "sesame"
    ]
  },
  {
    "name": "Chow Ngau Ho",
    "category": "Asian Noodle",
    "veg": false,
    "vegan": false,
    "halal": false,
    "allergens": [
      "gluten",
      "soy",
      "sesame"
    ]
  },
  {
    "name": "Beef & Black Bean Noodle",
    "category": "Asian Noodle",
    "veg": false,
    "vegan": false,
    "halal": false,
    "allergens": [
      "gluten",
      "soy",
      "sesame"
    ]
  },
  {
    "name": "Combination Laksa Noodle Soup",
    "category": "Asian Noodle",
    "veg": false,
    "vegan": false,
    "halal": false,
    "allergens": [
      "gluten",
      "nuts",
      "crustacean",
      "fish",
      "soy",
      "sesame"
    ]
  },
  {
    "name": "Noodle Thai Green Curry",
    "category": "Asian Noodle",
    "veg": false,
    "vegan": false,
    "halal": false,
    "allergens": [
      "gluten",
      "crustacean",
      "fish",
      "nuts",
      "soy",
      "sesame"
    ]
  },
  {
    "name": "Roasted Duck Egg Noodle Soup",
    "category": "Asian Noodle",
    "veg": false,
    "vegan": false,
    "halal": true,
    "allergens": [
      "gluten",
      "egg",
      "soy",
      "sesame"
    ]
  },
  {
    "name": "BBQ Pork Egg Noodle Soup",
    "category": "Asian Noodle",
    "veg": false,
    "vegan": false,
    "halal": false,
    "allergens": [
      "gluten",
      "egg",
      "soy",
      "sesame"
    ]
  },
  {
    "name": "Crispy Roast Pork Egg Noodle Soup",
    "category": "Asian Noodle",
    "veg": false,
    "vegan": false,
    "halal": false,
    "allergens": [
      "gluten",
      "egg",
      "soy",
      "sesame"
    ]
  },
  {
    "name": "Crispy Chicken Egg Noodle Soup",
    "category": "Asian Noodle",
    "veg": false,
    "vegan": false,
    "halal": false,
    "allergens": [
      "gluten",
      "egg",
      "soy",
      "sesame"
    ]
  },
  {
    "name": "Combination Egg Noodle Soup",
    "category": "Asian Noodle",
    "veg": false,
    "vegan": false,
    "halal": false,
    "allergens": [
      "gluten",
      "egg",
      "crustacean",
      "fish",
      "soy",
      "sesame"
    ]
  },
  {
    "name": "Veges & Tofu Stir Fried Egg Noodle",
    "category": "Asian Noodle",
    "veg": true,
    "vegan": false,
    "halal": false,
    "allergens": [
      "gluten",
      "egg",
      "soy",
      "sesame"
    ]
  },
  {
    "name": "Stir Fried Garlic Prawn & Chicken Noodle",
    "category": "Asian Noodle",
    "veg": false,
    "vegan": false,
    "halal": false,
    "allergens": [
      "gluten",
      "egg",
      "crustacean",
      "fish",
      "soy",
      "sesame"
    ]
  },
  {
    "name": "Stir Fried Noodle - Crispy Roast Pork",
    "category": "Asian Noodle",
    "veg": false,
    "vegan": false,
    "halal": false,
    "allergens": [
      "gluten",
      "egg",
      "soy",
      "sesame"
    ]
  },
  {
    "name": "Stir Fried Noodle - Chicken",
    "category": "Asian Noodle",
    "veg": false,
    "vegan": false,
    "halal": true,
    "allergens": [
      "gluten",
      "egg",
      "soy",
      "sesame"
    ]
  },
  {
    "name": "Stir Fried Noodle - Beef",
    "category": "Asian Noodle",
    "veg": false,
    "vegan": false,
    "halal": false,
    "allergens": [
      "gluten",
      "egg",
      "soy",
      "sesame"
    ]
  },
  {
    "name": "Stir Fried Noodle - Combination",
    "category": "Asian Noodle",
    "veg": false,
    "vegan": false,
    "halal": false,
    "allergens": [
      "gluten",
      "egg",
      "crustacean",
      "fish",
      "soy",
      "sesame"
    ]
  },
  {
    "name": "Stir Fried Noodle - Seafood",
    "category": "Asian Noodle",
    "veg": false,
    "vegan": false,
    "halal": false,
    "allergens": [
      "gluten",
      "egg",
      "crustacean",
      "fish",
      "soy",
      "sesame"
    ]
  },
  {
    "name": "Stir Fried Noodle - Veggie & Tofu",
    "category": "Asian Noodle",
    "veg": true,
    "vegan": false,
    "halal": false,
    "allergens": [
      "gluten",
      "egg",
      "soy",
      "sesame"
    ]
  },
  {
    "name": "Chicken or Beef Omelette",
    "category": "Omelette",
    "veg": false,
    "vegan": false,
    "halal": false,
    "allergens": [
      "egg",
      "soy",
      "sesame"
    ]
  },
  {
    "name": "Combination Omelette",
    "category": "Omelette",
    "veg": false,
    "vegan": false,
    "halal": false,
    "allergens": [
      "egg",
      "crustacean",
      "fish",
      "soy",
      "sesame"
    ]
  },
  {
    "name": "Veges & Tofu Omelette",
    "category": "Omelette",
    "veg": true,
    "vegan": false,
    "halal": true,
    "allergens": [
      "egg",
      "soy",
      "sesame"
    ]
  },
  {
    "name": "BBQ Pork Omelette",
    "category": "Omelette",
    "veg": false,
    "vegan": false,
    "halal": false,
    "allergens": [
      "egg",
      "soy",
      "sesame"
    ]
  },
  {
    "name": "Seafood Omelette",
    "category": "Omelette",
    "veg": false,
    "vegan": false,
    "halal": false,
    "allergens": [
      "egg",
      "crustacean",
      "fish",
      "soy",
      "sesame"
    ]
  },
  {
    "name": "Chicken Fillet Burger",
    "category": "Burger",
    "veg": false,
    "vegan": false,
    "halal": false,
    "allergens": [
      "gluten",
      "egg",
      "dairy",
      "soy",
      "sesame"
    ]
  },
  {
    "name": "Maxi Burger",
    "category": "Burger",
    "veg": false,
    "vegan": false,
    "halal": false,
    "allergens": [
      "gluten",
      "egg",
      "dairy",
      "soy",
      "sesame"
    ]
  },
  {
    "name": "Mr Hot Burger",
    "category": "Burger",
    "veg": false,
    "vegan": false,
    "halal": false,
    "allergens": [
      "gluten",
      "egg",
      "dairy",
      "soy",
      "sesame"
    ]
  },
  {
    "name": "Mr Vegetarian Burger",
    "category": "Burger",
    "veg": true,
    "vegan": false,
    "halal": false,
    "allergens": [
      "gluten",
      "nuts",
      "egg",
      "dairy",
      "soy",
      "sesame"
    ]
  },
  {
    "name": "Chicken Pack (3 pieces)",
    "category": "Burger",
    "veg": false,
    "vegan": false,
    "halal": false,
    "allergens": [
      "gluten",
      "egg",
      "soy"
    ]
  },
  {
    "name": "Chicken Strips (5 pieces)",
    "category": "Burger",
    "veg": false,
    "vegan": false,
    "halal": false,
    "allergens": [
      "gluten",
      "egg",
      "soy"
    ]
  },
  {
    "name": "Chips (Regular)",
    "category": "Burger",
    "veg": true,
    "vegan": true,
    "halal": true,
    "allergens": []
  },
  {
    "name": "Lunch Box (2pc chicken + chips)",
    "category": "Burger",
    "veg": false,
    "vegan": false,
    "halal": false,
    "allergens": [
      "gluten",
      "egg",
      "soy"
    ]
  },
  {
    "name": "Golden Chunks Surprise",
    "category": "Burger",
    "veg": false,
    "vegan": false,
    "halal": false,
    "allergens": [
      "gluten",
      "egg",
      "soy"
    ]
  },
  {
    "name": "Crispy Fried Chicken Bao",
    "category": "Bao - Steamed Bun",
    "veg": false,
    "vegan": false,
    "halal": false,
    "allergens": [
      "gluten",
      "egg",
      "dairy",
      "soy",
      "sesame"
    ]
  },
  {
    "name": "Lemongrass Beef Bao",
    "category": "Bao - Steamed Bun",
    "veg": false,
    "vegan": false,
    "halal": false,
    "allergens": [
      "gluten",
      "dairy",
      "soy",
      "sesame"
    ]
  },
  {
    "name": "Lemongrass Chicken Bao",
    "category": "Bao - Steamed Bun",
    "veg": false,
    "vegan": false,
    "halal": true,
    "allergens": [
      "gluten",
      "dairy",
      "soy",
      "sesame"
    ]
  },
  {
    "name": "Crackling Roasted Pork Bao",
    "category": "Bao - Steamed Bun",
    "veg": false,
    "vegan": false,
    "halal": false,
    "allergens": [
      "gluten",
      "dairy",
      "soy",
      "sesame"
    ]
  },
  {
    "name": "Crispy Tofu Bao",
    "category": "Bao - Steamed Bun",
    "veg": true,
    "vegan": false,
    "halal": false,
    "allergens": [
      "gluten",
      "dairy",
      "egg",
      "soy",
      "sesame"
    ]
  },
  {
    "name": "BBQ Duck Bao",
    "category": "Bao - Steamed Bun",
    "veg": false,
    "vegan": false,
    "halal": true,
    "allergens": [
      "gluten",
      "dairy",
      "soy",
      "sesame"
    ]
  },
  {
    "name": "BBQ Pork Charsiu Bao",
    "category": "Bao - Steamed Bun",
    "veg": false,
    "vegan": false,
    "halal": false,
    "allergens": [
      "gluten",
      "dairy",
      "soy",
      "sesame"
    ]
  },
  {
    "name": "Satay Chicken Bao",
    "category": "Bao - Steamed Bun",
    "veg": false,
    "vegan": false,
    "halal": true,
    "allergens": [
      "gluten",
      "nuts",
      "dairy",
      "soy",
      "sesame"
    ]
  },
  {
    "name": "Vegetarian Spring Roll (4)",
    "category": "Vegetarian Menu",
    "veg": true,
    "vegan": true,
    "halal": false,
    "allergens": [
      "gluten",
      "soy",
      "sesame"
    ]
  },
  {
    "name": "Tofu & Veges Baguette",
    "category": "Vegetarian Menu",
    "veg": true,
    "vegan": false,
    "halal": true,
    "allergens": [
      "gluten",
      "nuts",
      "dairy",
      "egg",
      "soy",
      "sesame"
    ]
  },
  {
    "name": "Mushroom, Tofu and Basil Baguette",
    "category": "Vegetarian Menu",
    "veg": true,
    "vegan": false,
    "halal": true,
    "allergens": [
      "gluten",
      "nuts",
      "dairy",
      "egg",
      "soy",
      "sesame"
    ]
  },
  {
    "name": "Egg Noodle Vegetarian Soup",
    "category": "Vegetarian Menu",
    "veg": true,
    "vegan": false,
    "halal": false,
    "allergens": [
      "gluten",
      "egg",
      "soy",
      "sesame"
    ]
  },
  {
    "name": "Vegetables Soup (Small)",
    "category": "Vegetarian Menu",
    "veg": true,
    "vegan": true,
    "halal": true,
    "allergens": [
      "soy"
    ]
  },
  {
    "name": "Vegetable & Tofu Pancake",
    "category": "Vegetarian Menu",
    "veg": true,
    "vegan": false,
    "halal": true,
    "allergens": [
      "soy"
    ]
  },
  {
    "name": "Vegetarian Fried Rice",
    "category": "Vegetarian Menu",
    "veg": true,
    "vegan": false,
    "halal": false,
    "allergens": [
      "egg",
      "soy",
      "sesame"
    ]
  },
  {
    "name": "Vegetarian Stir Fried Flat Rice Noodle",
    "category": "Vegetarian Menu",
    "veg": true,
    "vegan": false,
    "halal": false,
    "allergens": [
      "gluten",
      "soy",
      "sesame"
    ]
  },
  {
    "name": "Hot Plate Sweet & Sour Tofu & Veges",
    "category": "Vegetarian Menu",
    "veg": true,
    "vegan": false,
    "halal": true,
    "allergens": [
      "gluten",
      "soy",
      "sesame"
    ]
  },
  {
    "name": "Vegetable Chow Mein",
    "category": "Vegetarian Menu",
    "veg": true,
    "vegan": false,
    "halal": false,
    "allergens": [
      "gluten",
      "egg",
      "soy",
      "sesame"
    ]
  },
  {
    "name": "Vegetable Garlic or Oyster Sauce",
    "category": "Vegetarian Menu",
    "veg": true,
    "vegan": false,
    "halal": true,
    "allergens": [
      "gluten",
      "soy",
      "fish"
    ]
  },
  {
    "name": "Hot Plate Vegetable and Cashew",
    "category": "Vegetarian Menu",
    "veg": true,
    "vegan": true,
    "halal": true,
    "allergens": [
      "nuts",
      "soy",
      "sesame"
    ]
  },
  {
    "name": "Hot Plate Veg & Tofu Green Curry/Satay",
    "category": "Vegetarian Menu",
    "veg": true,
    "vegan": false,
    "halal": true,
    "allergens": [
      "nuts",
      "soy",
      "sesame"
    ]
  },
  {
    "name": "Hot Plate Vegetable Chilli/Black Bean",
    "category": "Vegetarian Menu",
    "veg": true,
    "vegan": true,
    "halal": true,
    "allergens": [
      "gluten",
      "soy"
    ]
  },
  {
    "name": "Garlic Bok Choy with Oyster Sauce",
    "category": "Vegetarian Menu",
    "veg": true,
    "vegan": false,
    "halal": true,
    "allergens": [
      "gluten",
      "soy",
      "fish"
    ]
  },
  {
    "name": "Coke / Pepsi / Soft Drink (can)",
    "category": "Drinks",
    "veg": true,
    "vegan": true,
    "halal": true,
    "allergens": []
  },
  {
    "name": "Bottle Juice / Ice Tea",
    "category": "Drinks",
    "veg": true,
    "vegan": true,
    "halal": true,
    "allergens": []
  },
  {
    "name": "Vietnamese Jasmine/Green Tea Pot",
    "category": "Drinks",
    "veg": true,
    "vegan": true,
    "halal": true,
    "allergens": []
  },
  {
    "name": "Homemade Iced Lemon Tea",
    "category": "Drinks",
    "veg": true,
    "vegan": true,
    "halal": true,
    "allergens": []
  },
  {
    "name": "Natural Mineral Water",
    "category": "Drinks",
    "veg": true,
    "vegan": true,
    "halal": true,
    "allergens": []
  },
  {
    "name": "Vietnamese Iced Coffee w/ Condensed Milk",
    "category": "Drinks",
    "veg": true,
    "vegan": false,
    "halal": true,
    "allergens": [
      "dairy"
    ]
  }
];
