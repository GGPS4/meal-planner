/*
 * data.js
 * Starting data for the planner: grocery items, recipes, add-ons and the default week.
 *
 * Edit this file to customize the planner. Saved changes in the browser (prices,
 * schedule edits, checkmarks) are stored in localStorage and override these defaults
 * until you use "Reset planner".
 *
 * Units
 *   Every grocery item has one "unit" that recipes measure in (for example "oz raw" or "cup dry").
 *   packageSize = how many of those units come in one store package.
 *   proteinPerUnit = estimated grams of protein per unit. These are estimates from typical
 *   USDA FoodData Central values and common US package labels, rounded down. Spices, oil,
 *   salt and mayonnaise are counted as 0 g.
 *
 * Kosher type for items: "meat", "dairy", "pareve" or "fish" (fish is pareve but is kept
 * apart from meat in many kosher households, so the planner tracks it separately).
 */

window.PLANNER_DATA = {
  // Bump this when the shape of the data changes so old saved data is not misread.
  dataVersion: 1,

  defaults: {
    budget: 109,          // weekly maximum, including tax
    taxRate: 8,           // percent; applied only to items marked taxable
    buffer: 5,            // contingency dollars kept aside inside the budget
    proteinGoal: 100      // grams per day
  },

  categories: [
    { id: "protein", name: "Protein" },
    { id: "carbs", name: "Carbohydrates" },
    { id: "produce", name: "Vegetables and fruit" },
    { id: "pantry", name: "Sauces and pantry items" },
    { id: "other", name: "Other" }
  ],

  /* ---------------------------------------------------------------- items */
  items: [
    // Protein
    { id: "beef", name: "Kosher ground beef (80/20)", category: "protein", unit: "oz raw",
      packageSize: 16, packageLabel: "1 lb pack", price: 9.49, proteinPerUnit: 4.9, kosher: "meat",
      notes: "Kosher meat case or freezer section. Prices vary a lot by store.",
      kosherNote: "Buy only with a hechsher your household accepts." },
    { id: "chicken", name: "Kosher boneless skinless chicken thighs", category: "protein", unit: "oz raw",
      packageSize: 16, packageLabel: "1 lb, sold by weight", price: 7.49, proteinPerUnit: 5.5, kosher: "meat",
      notes: "Breast works too. Thighs are usually cheaper and harder to overcook.",
      kosherNote: "Buy only with a hechsher your household accepts." },
    { id: "eggs", name: "Large eggs", category: "protein", unit: "egg",
      packageSize: 12, packageLabel: "dozen", price: 3.49, proteinPerUnit: 6.3, kosher: "pareve",
      notes: "Store brand is fine.",
      kosherNote: "Crack each egg into a cup first and check for blood spots." },
    { id: "tuna", name: "Chunk light tuna in water", category: "protein", unit: "can",
      packageSize: 1, packageLabel: "5 oz can", price: 1.29, proteinPerUnit: 20, kosher: "fish",
      notes: "Store brand cans are usually the cheapest.",
      kosherNote: "Must carry a kosher symbol your household accepts." },
    { id: "lentils", name: "Dry brown or green lentils", category: "protein", unit: "cup dry",
      packageSize: 2.25, packageLabel: "1 lb bag (about 2¼ cups)", price: 1.79, proteinPerUnit: 46, kosher: "pareve",
      notes: "Usually in the rice and beans aisle.",
      kosherNote: "Check the bag for a hechsher if your household requires one." },
    { id: "beans", name: "Black beans, canned", category: "protein", unit: "cup drained",
      packageSize: 1.5, packageLabel: "15 oz can (about 1½ cups drained)", price: 1.09, proteinPerUnit: 14, kosher: "pareve",
      notes: "Rinse before using to cut the sodium.",
      kosherNote: "Check the can for a hechsher." },

    // Carbohydrates
    { id: "rice", name: "Long-grain white rice", category: "carbs", unit: "cup dry",
      packageSize: 4.5, packageLabel: "2 lb bag (about 4½ cups dry)", price: 2.49, proteinPerUnit: 12, kosher: "pareve",
      notes: "Store brand.",
      kosherNote: "Check for a hechsher per your household's standard." },
    { id: "pasta", name: "Regular pasta (penne or spaghetti)", category: "carbs", unit: "oz dry",
      packageSize: 16, packageLabel: "1 lb box", price: 1.39, proteinPerUnit: 3.5, kosher: "pareve",
      notes: "Any ordinary wheat pasta.",
      kosherNote: "Look for a hechsher and make sure it is not marked dairy." },
    { id: "bread", name: "Sandwich bread, pareve", category: "carbs", unit: "slice",
      packageSize: 20, packageLabel: "20 oz loaf (about 20 slices)", price: 2.99, proteinPerUnit: 3, kosher: "pareve",
      notes: "Whole wheat often has a little more protein. Check the label.",
      kosherNote: "Must be certified pareve, not dairy (D), so it can be eaten near meat meals." },
    { id: "potatoes", name: "Russet potatoes", category: "carbs", unit: "lb",
      packageSize: 1, packageLabel: "loose, per lb", price: 1.09, proteinPerUnit: 9, kosher: "pareve",
      notes: "Buy loose. A 3 lb bag is only worth it if you will use the rest.",
      kosherNote: "Fresh produce needs no certification." },
    { id: "oats", name: "Old-fashioned rolled oats", category: "carbs", unit: "cup dry",
      packageSize: 6, packageLabel: "18 oz canister (about 6 cups)", price: 2.79, proteinPerUnit: 10, kosher: "pareve",
      notes: "Store brand.",
      kosherNote: "Check for a hechsher." },

    // Vegetables and fruit
    { id: "veg", name: "Frozen mixed vegetables", category: "produce", unit: "cup",
      packageSize: 2.5, packageLabel: "12 oz bag (about 2½ cups)", price: 1.29, proteinPerUnit: 3, kosher: "pareve",
      notes: "Plain vegetables only, no sauce packets.",
      kosherNote: "Many households require a hechsher on frozen vegetables. Follow your standard." },
    { id: "onions", name: "Yellow onions", category: "produce", unit: "onion",
      packageSize: 5, packageLabel: "2 lb bag (about 5 onions)", price: 2.29, proteinPerUnit: 1.1, kosher: "pareve",
      notes: "Keep in a cool, dry place.",
      kosherNote: "Fresh produce needs no certification." },
    { id: "carrots", name: "Carrots", category: "produce", unit: "carrot",
      packageSize: 6, packageLabel: "1 lb bag (about 6 carrots)", price: 1.19, proteinPerUnit: 0.6, kosher: "pareve",
      notes: "Whole carrots are cheaper than baby carrots.",
      kosherNote: "Fresh produce needs no certification." },
    { id: "bananas", name: "Bananas", category: "produce", unit: "banana",
      packageSize: 1, packageLabel: "each", price: 0.29, proteinPerUnit: 1.3, kosher: "pareve",
      notes: "Buy some green so they last the week.",
      kosherNote: "Fresh produce needs no certification." },

    // Sauces and pantry items
    { id: "marinara", name: "Tomato pasta sauce (marinara)", category: "pantry", unit: "cup",
      packageSize: 2.5, packageLabel: "24 oz jar (about 2½ cups)", price: 2.29, proteinPerUnit: 4, kosher: "pareve",
      notes: "Plain marinara. Skip sauces with cheese.",
      kosherNote: "Confirm a hechsher and that it is pareve, not dairy." },
    { id: "pb", name: "Peanut butter", category: "pantry", unit: "tbsp",
      packageSize: 28, packageLabel: "16 oz jar (about 28 tbsp)", price: 2.49, proteinPerUnit: 3.5, kosher: "pareve",
      notes: "Store brand creamy or crunchy.",
      kosherNote: "Check for a hechsher and a pareve marking." },
    { id: "mayo", name: "Mayonnaise", category: "pantry", unit: "tbsp",
      packageSize: 30, packageLabel: "15 oz jar", price: 2.79, proteinPerUnit: 0, kosher: "pareve",
      notes: "Counted as 0 g protein.",
      kosherNote: "Confirm a hechsher and that it is pareve." },
    { id: "soy", name: "Soy sauce", category: "pantry", unit: "tbsp",
      packageSize: 20, packageLabel: "10 oz bottle", price: 1.99, proteinPerUnit: 1, kosher: "pareve",
      notes: "Regular soy sauce.",
      kosherNote: "Confirm a hechsher." },
    { id: "oil", name: "Vegetable or canola oil", category: "pantry", unit: "tbsp",
      packageSize: 48, packageLabel: "24 oz bottle", price: 3.49, proteinPerUnit: 0, kosher: "pareve",
      notes: "Counted as 0 g protein.",
      kosherNote: "Confirm a hechsher." },
    { id: "garlic", name: "Garlic powder", category: "pantry", unit: "tsp",
      packageSize: 30, packageLabel: "small jar", price: 1.49, proteinPerUnit: 0, kosher: "pareve",
      notes: "Spices are counted as 0 g protein.",
      kosherNote: "Spices and blends need a hechsher in many households." },
    { id: "paprika", name: "Paprika", category: "pantry", unit: "tsp",
      packageSize: 30, packageLabel: "small jar", price: 1.49, proteinPerUnit: 0, kosher: "pareve",
      notes: "Spices are counted as 0 g protein.",
      kosherNote: "Spices and blends need a hechsher in many households." },
    { id: "italian", name: "Italian seasoning", category: "pantry", unit: "tsp",
      packageSize: 30, packageLabel: "small jar", price: 1.49, proteinPerUnit: 0, kosher: "pareve",
      notes: "Spices are counted as 0 g protein.",
      kosherNote: "Blends especially should carry a hechsher." },
    { id: "cumin", name: "Ground cumin", category: "pantry", unit: "tsp",
      packageSize: 30, packageLabel: "small jar", price: 1.49, proteinPerUnit: 0, kosher: "pareve",
      notes: "Only needed for the burrito bowl and lentil soup.",
      kosherNote: "Spices and blends need a hechsher in many households." },
    { id: "chili", name: "Chili powder", category: "pantry", unit: "tsp",
      packageSize: 30, packageLabel: "small jar", price: 1.49, proteinPerUnit: 0, kosher: "pareve",
      notes: "Only needed for the burrito bowl.",
      kosherNote: "Chili powder is a blend. Check for a hechsher." },
    { id: "salt", name: "Salt", category: "pantry", unit: "tsp",
      packageSize: 150, packageLabel: "26 oz canister", price: 0.99, proteinPerUnit: 0, kosher: "pareve",
      notes: "Most kitchens already have this.",
      kosherNote: "Check for a hechsher." },
    { id: "pepper", name: "Black pepper", category: "pantry", unit: "tsp",
      packageSize: 30, packageLabel: "small jar", price: 1.99, proteinPerUnit: 0, kosher: "pareve",
      notes: "Most kitchens already have this.",
      kosherNote: "Check for a hechsher." }
  ],

  /* ---------------------------------------------------------------- recipes
   * Ingredient quantities are PER SERVING. baseServings is how many servings the
   * recipe card shows by default. "free" ingredients (water) are not shopped for.
   */
  recipes: [
    {
      id: "chickenRice", name: "Chicken, rice, and vegetables", kosher: "meat",
      baseServings: 2, prepMin: 10, cookMin: 25,
      photo: { id: "1606250593181-5a81736038ed", by: "Karolina Kołodziejczak",
        page: "https://unsplash.com/photos/rice-with-sliced-vegetables-on-green-ceramic-plate-84JxtS4vI2A",
        alt: "Seared chicken pieces with mixed vegetables and white rice on a plate" },
      ingredients: [
        { item: "chicken", qty: 6, note: "raw weight, cut into 1 inch pieces" },
        { item: "rice", qty: 0.5 },
        { item: "veg", qty: 1 },
        { item: "oil", qty: 0.5 },
        { item: "garlic", qty: 0.25 },
        { item: "paprika", qty: 0.5 },
        { item: "salt", qty: 0.25 },
        { item: "pepper", qty: 0.125 }
      ],
      steps: [
        "Rinse the rice. Add it to a pot with about twice as much water and a pinch of salt (check your package for its exact ratio). Bring to a boil, cover, turn the heat to low and simmer 15 to 18 minutes. Let it rest covered for 5 minutes.",
        "While the rice cooks, cut the chicken into 1 inch pieces and toss with the garlic powder, paprika, salt and pepper.",
        "Heat the oil in a large skillet over medium-high heat. Add the chicken in one layer and cook 6 to 8 minutes, turning once, until browned and 165°F in the thickest piece.",
        "Add the frozen vegetables and 2 tablespoons of water to the skillet. Cover and cook 4 to 5 minutes, until the vegetables are hot.",
        "Serve the chicken and vegetables over the rice."
      ],
      weightNote: "Chicken is weighed raw. 6 oz raw cooks down to about 4½ oz.",
      safety: "Cook chicken to 165°F. Wash your hands, knife and cutting board with hot soapy water after touching raw chicken.",
      storage: "Refrigerate leftovers in shallow containers within 2 hours. They keep 3 to 4 days in the fridge or 2 to 3 months in the freezer. Reheat to 165°F."
    },
    {
      id: "tunaSandwich", name: "Tuna sandwich", kosher: "fish",
      baseServings: 1, prepMin: 10, cookMin: 0,
      photo: { id: "1558985250-27a406d64cb3", by: "Youjeen Cho",
        page: "https://unsplash.com/photos/sandwich-on-table-sBKLiRiunK0",
        alt: "Tuna salad sandwich with tomato and greens on whole grain bread" },
      ingredients: [
        { item: "tuna", qty: 1, note: "drained" },
        { item: "bread", qty: 2 },
        { item: "mayo", qty: 1 },
        { item: "carrots", qty: 1, note: "cut into sticks, on the side" },
        { item: "pepper", qty: 0.125 }
      ],
      steps: [
        "Open the tuna and press the lid down to drain off all the water.",
        "Mix the tuna, mayonnaise and pepper in a bowl with a fork.",
        "Spread the tuna on one slice of bread and top with the second slice.",
        "Peel the carrot, cut it into sticks and serve it on the side."
      ],
      weightNote: "Protein assumes about 20 g per 5 oz can of chunk light tuna. Check your can's label.",
      safety: "Keep tuna salad cold. Do not leave it out for more than 2 hours.",
      storage: "Tuna salad keeps 3 to 5 days in a covered container in the fridge. Assemble sandwiches the day you eat them so the bread stays firm."
    },
    {
      id: "tunaPasta", name: "Tuna pasta with tomato sauce", kosher: "fish",
      baseServings: 1, prepMin: 5, cookMin: 15,
      photo: { id: "1582035619445-9c26d5de240d", by: "Kenneth Mallia",
        page: "https://unsplash.com/photos/pasta-dish-on-white-ceramic-plate-jJNDQQjJr-Y",
        alt: "Penne in tomato sauce on a white plate" },
      ingredients: [
        { item: "pasta", qty: 3, note: "dry weight" },
        { item: "tuna", qty: 1, note: "drained" },
        { item: "marinara", qty: 0.5 },
        { item: "oil", qty: 0.333 },
        { item: "garlic", qty: 0.25 },
        { item: "italian", qty: 0.5 },
        { item: "salt", qty: 0.25, note: "for the pasta water" }
      ],
      steps: [
        "Bring a pot of water to a boil with the salt. Cook the pasta for the time on the box, usually 10 to 12 minutes.",
        "While the pasta cooks, warm the oil, sauce, garlic powder and Italian seasoning in a skillet over medium-low heat for 3 to 4 minutes.",
        "Drain the tuna, stir it into the sauce and heat for 2 more minutes.",
        "Drain the pasta and toss it with the sauce."
      ],
      weightNote: "Pasta is weighed dry. 3 oz dry is about 1½ cups cooked.",
      safety: "Reheat leftovers until steaming hot, 165°F.",
      storage: "Best eaten fresh. Leftovers keep 3 to 4 days in the fridge."
    },
    {
      id: "burritoBowl", name: "Chicken and black bean burrito bowl", kosher: "meat",
      baseServings: 2, prepMin: 10, cookMin: 20,
      photo: { id: "1716392976013-66d90cac4411", by: "AnaCristina Smith",
        page: "https://unsplash.com/photos/a-plate-of-chicken-black-beans-corn-and-salsa-cIXQYJ8V0Gw",
        alt: "Grilled chicken with black beans, corn and fresh salsa in a dark bowl" },
      ingredients: [
        { item: "chicken", qty: 5, note: "raw weight" },
        { item: "beans", qty: 0.75, note: "rinsed and drained" },
        { item: "rice", qty: 0.5 },
        { item: "onions", qty: 0.25, note: "diced" },
        { item: "oil", qty: 0.5 },
        { item: "cumin", qty: 0.5 },
        { item: "chili", qty: 0.5 },
        { item: "garlic", qty: 0.25 },
        { item: "salt", qty: 0.25 }
      ],
      steps: [
        "Cook the rice: rinse it, add about twice as much water and a pinch of salt, boil, then cover and simmer on low 15 to 18 minutes.",
        "Cut the chicken into small pieces and toss with the cumin, chili powder, garlic powder and salt.",
        "Heat the oil in a skillet over medium heat. Cook the onion for 3 minutes, then add the chicken and cook 6 to 8 minutes until it reaches 165°F.",
        "Add the rinsed beans and cook 2 to 3 minutes until hot.",
        "Spoon the chicken and beans over the rice. This is a meat meal, so leave out cheese and sour cream."
      ],
      weightNote: "Chicken is weighed raw. 5 oz raw cooks down to about 3¾ oz. Cooked chicken from Monday's batch works too.",
      safety: "Cook chicken to 165°F. If using leftover chicken, reheat it to 165°F.",
      storage: "Refrigerate within 2 hours. Keeps 3 to 4 days in the fridge or 2 to 3 months frozen."
    },
    {
      id: "beefSkillet", name: "Beef and potato skillet", kosher: "meat",
      baseServings: 2, prepMin: 10, cookMin: 25,
      photo: { id: "1680529669043-9a7777b798bc", by: "Marlom Veloso",
        page: "https://unsplash.com/photos/a-bowl-of-food-with-a-spoon-in-it-Y8e1EVwu3lA",
        alt: "Diced potatoes cooked with ground beef in a dark pot" },
      ingredients: [
        { item: "beef", qty: 8, note: "raw weight" },
        { item: "potatoes", qty: 0.5, note: "cut into ½ inch cubes" },
        { item: "onions", qty: 0.5, note: "diced" },
        { item: "veg", qty: 0.5 },
        { item: "oil", qty: 0.5 },
        { item: "paprika", qty: 0.5 },
        { item: "garlic", qty: 0.25 },
        { item: "salt", qty: 0.25 },
        { item: "pepper", qty: 0.125 }
      ],
      steps: [
        "Cut the potatoes into ½ inch cubes. Smaller pieces cook faster.",
        "Heat the oil in a large skillet over medium heat. Add the potatoes, cover and cook 10 to 12 minutes, stirring every few minutes, until a fork slides in easily.",
        "Push the potatoes to the side. Add the onion and ground beef, break the beef up with a spoon and cook 6 to 8 minutes until no pink remains and it reaches 160°F.",
        "Carefully spoon off extra fat. Stir in the frozen vegetables, paprika, garlic powder, salt and pepper. Cook 4 more minutes until everything is hot."
      ],
      weightNote: "Beef is weighed raw. 8 oz raw cooks down to about 6 oz.",
      safety: "Cook ground beef to 160°F. Raw ground beef keeps only 1 to 2 days in the fridge, so freeze what you will not cook soon.",
      storage: "Refrigerate within 2 hours. Keeps 3 to 4 days in the fridge or 2 to 3 months frozen. Reheat to 165°F."
    },
    {
      id: "lentilSoup", name: "Lentil soup", kosher: "pareve",
      baseServings: 4, prepMin: 10, cookMin: 30,
      photo: { id: "1552298013-de2af4b94854", by: "Steve Tsang",
        page: "https://unsplash.com/photos/soup-in-maroon-ceramic-pot-MP_A0OK_O60",
        alt: "Brown lentil soup in a small red pot" },
      ingredients: [
        { item: "lentils", qty: 0.5, note: "rinsed" },
        { item: "carrots", qty: 0.5, note: "diced" },
        { item: "onions", qty: 0.25, note: "diced" },
        { item: "marinara", qty: 0.25 },
        { item: "oil", qty: 0.5 },
        { item: "cumin", qty: 0.5 },
        { item: "garlic", qty: 0.25 },
        { item: "salt", qty: 0.25 },
        { item: "pepper", qty: 0.125 },
        { free: true, name: "Water", qty: 1.5, unit: "cup" }
      ],
      steps: [
        "Rinse the lentils in a strainer and pick out any small stones.",
        "Heat the oil in a pot over medium heat. Cook the onion and carrot for 5 minutes, stirring now and then.",
        "Add the lentils, water, tomato sauce, cumin, garlic powder and salt. Bring to a boil.",
        "Turn the heat to low, cover and simmer 25 to 30 minutes until the lentils are soft. Add a splash of water if it gets too thick. Season with pepper."
      ],
      weightNote: "Lentils are measured dry. ½ cup dry makes about 1¼ cups cooked. Water-based, so the soup stays pareve.",
      safety: "Cool the soup quickly by dividing it into shallow containers before refrigerating.",
      storage: "Keeps 3 to 4 days in the fridge or 2 to 3 months frozen. It thickens as it sits, so add water when reheating to 165°F."
    },
    {
      id: "friedRice", name: "Chicken and egg fried rice", kosher: "meat",
      baseServings: 1, prepMin: 10, cookMin: 15,
      photo: { id: "1664717698774-84f62382613b", by: "herry shani",
        page: "https://unsplash.com/photos/a-bowl-of-rice-with-vegetables-MVMohJBieo4",
        alt: "Fried rice with peas, carrots and green onion in a black bowl" },
      ingredients: [
        { item: "chicken", qty: 5, note: "raw weight, cut small" },
        { item: "eggs", qty: 2 },
        { item: "rice", qty: 0.5, note: "dry, cooked and chilled ahead" },
        { item: "veg", qty: 0.5 },
        { item: "onions", qty: 0.25, note: "diced" },
        { item: "soy", qty: 1 },
        { item: "oil", qty: 1 },
        { item: "garlic", qty: 0.25 }
      ],
      steps: [
        "Cook the rice ahead and chill it. Cold rice fries better than fresh rice.",
        "Heat half the oil in a large skillet over medium-high heat. Cook the chicken 5 to 7 minutes until it reaches 165°F, then move it to a plate.",
        "Add the rest of the oil, the onion and the frozen vegetables. Cook 3 minutes.",
        "Push everything to one side. Crack the eggs into the empty side and scramble until fully set.",
        "Add the cold rice, chicken, soy sauce and garlic powder. Stir-fry 3 to 4 minutes until steaming hot."
      ],
      weightNote: "Chicken is weighed raw. Rice is measured dry before cooking.",
      safety: "Cook chicken to 165°F and eggs until firm. Refrigerate cooked rice within 2 hours of cooking.",
      storage: "Refrigerate within 2 hours. Keeps 3 to 4 days in the fridge. Reheat to 165°F."
    },
    {
      id: "beefPasta", name: "Beef pasta with tomato sauce", kosher: "meat",
      baseServings: 2, prepMin: 5, cookMin: 20,
      photo: { id: "1673442635965-34f1b36d8944", by: "Sofia Ciravegna",
        page: "https://unsplash.com/photos/a-plate-of-spaghetti-with-meat-and-tomato-sauce-khQeenz99H0",
        alt: "Spaghetti with meat and tomato sauce topped with a basil leaf" },
      ingredients: [
        { item: "beef", qty: 8, note: "raw weight" },
        { item: "pasta", qty: 3, note: "regular pasta, dry weight" },
        { item: "marinara", qty: 0.5 },
        { item: "onions", qty: 0.25, note: "diced" },
        { item: "garlic", qty: 0.25 },
        { item: "italian", qty: 0.5 },
        { item: "salt", qty: 0.25, note: "for the pasta water" }
      ],
      steps: [
        "Bring a pot of water to a boil with the salt.",
        "Brown the beef and onion in a skillet over medium-high heat for 6 to 8 minutes, breaking the beef up, until no pink remains and it reaches 160°F. Spoon off extra fat.",
        "Stir in the sauce, garlic powder and Italian seasoning. Simmer 5 minutes.",
        "Cook the pasta for the time on the box, drain it and toss with the sauce. This is a meat meal, so no cheese on top."
      ],
      weightNote: "Beef is weighed raw (8 oz raw is about 6 oz cooked). Pasta is weighed dry.",
      safety: "Cook ground beef to 160°F. Reheat leftovers to 165°F.",
      storage: "Refrigerate within 2 hours. Keeps 3 to 4 days in the fridge or 2 to 3 months frozen."
    },
    {
      id: "oatmeal", name: "Oatmeal with peanut butter and banana", kosher: "pareve",
      baseServings: 1, prepMin: 2, cookMin: 5,
      photo: { id: "1715098841757-0e9690ec12d6", by: "Dimitris Asproloupos",
        page: "https://unsplash.com/photos/a-bowl-of-oatmeal-with-banana-slices-on-top-qzRVPgqSWn4",
        alt: "Bowl of oatmeal topped with banana slices" },
      ingredients: [
        { item: "oats", qty: 0.5 },
        { item: "pb", qty: 2 },
        { item: "bananas", qty: 1, note: "sliced" },
        { item: "salt", qty: 0.0625 },
        { free: true, name: "Water", qty: 1, unit: "cup" }
      ],
      steps: [
        "Bring the water and a pinch of salt to a boil in a small pot.",
        "Stir in the oats, lower the heat and simmer about 5 minutes, stirring now and then. (Or microwave in a large bowl for 2 to 3 minutes.)",
        "Stir in the peanut butter and top with the sliced banana."
      ],
      weightNote: "Oats are measured dry. Made with water, this stays pareve.",
      safety: "If you microwave it, use a large bowl so it does not boil over.",
      storage: "Best eaten fresh. Cooked oatmeal keeps up to 4 days in the fridge; loosen it with a splash of water when reheating."
    },
    {
      id: "eggsToast", name: "Eggs and toast", kosher: "pareve",
      baseServings: 1, prepMin: 2, cookMin: 8,
      photo: { id: "1694103198478-1f6d40027768", by: "Imad 786",
        page: "https://unsplash.com/photos/a-fried-egg-and-toast-on-a-plate-zFSwKehUHxg",
        alt: "Fried egg on a white plate with slices of bread" },
      ingredients: [
        { item: "eggs", qty: 4 },
        { item: "bread", qty: 2, note: "toasted" },
        { item: "oil", qty: 0.333 },
        { item: "salt", qty: 0.0625 },
        { item: "pepper", qty: 0.0625 }
      ],
      steps: [
        "Crack each egg into a cup first and check for blood spots, then add it to a bowl.",
        "Heat the oil in a nonstick skillet over medium heat. Use oil, not butter, to keep the meal pareve.",
        "Scramble or fry the eggs until the whites and yolks are firm, about 3 to 5 minutes. Season with salt and pepper.",
        "Toast the bread and serve."
      ],
      weightNote: "Protein uses about 6.3 g per large egg.",
      safety: "Cook eggs until both the white and yolk are firm.",
      storage: "Eat fresh. Hard-boiled eggs keep up to 1 week in the fridge in their shells."
    }
  ],

  /* ---------------------------------------------------------------- add-ons
   * Small protein additions that can be attached to any meal or snack slot.
   * fish: true means it is not offered on meat meals.
   */
  addons: [
    { id: "egg", name: "Egg, boiled or fried in oil", short: "Egg", ingredients: [{ item: "eggs", qty: 1 }] },
    { id: "pbToast", name: "Peanut butter toast (1 slice, 2 tbsp)", short: "PB toast", ingredients: [{ item: "bread", qty: 1 }, { item: "pb", qty: 2 }] },
    { id: "tunaCan", name: "Tuna (1 can)", short: "Tuna can", fish: true, ingredients: [{ item: "tuna", qty: 1 }] },
    { id: "beansHalf", name: "Black beans (½ cup)", short: "Black beans ½ cup", ingredients: [{ item: "beans", qty: 0.5 }] },
    { id: "breadSlice", name: "Bread (1 slice)", short: "Bread slice", ingredients: [{ item: "bread", qty: 1 }] }
  ],

  /* ---------------------------------------------------------------- default week
   * Monday is index 0. Each slot: recipe id (or null), servings, extras [{id, qty}], note.
   */
  schedule: [
    { // Monday
      breakfast: { recipe: "oatmeal", servings: 1, extras: [{ id: "egg", qty: 2 }] },
      lunch: { recipe: "tunaSandwich", servings: 1 },
      dinner: { recipe: "chickenRice", servings: 1, note: "Cook chicken for Tuesday and Thursday at the same time." },
      snack: { recipe: null, servings: 1, extras: [{ id: "pbToast", qty: 1 }] }
    },
    { // Tuesday
      breakfast: { recipe: "eggsToast", servings: 1 },
      lunch: { recipe: "burritoBowl", servings: 1, note: "Uses chicken cooked Monday." },
      dinner: { recipe: "tunaPasta", servings: 1 },
      snack: { recipe: null, servings: 1, extras: [] }
    },
    { // Wednesday
      breakfast: { recipe: "oatmeal", servings: 1 },
      lunch: { recipe: "tunaSandwich", servings: 1 },
      dinner: { recipe: "beefSkillet", servings: 1 },
      snack: { recipe: null, servings: 1, extras: [{ id: "egg", qty: 2 }, { id: "pbToast", qty: 1 }] }
    },
    { // Thursday
      breakfast: { recipe: "eggsToast", servings: 1 },
      lunch: { recipe: "chickenRice", servings: 1, note: "Leftover from Monday." },
      dinner: { recipe: "lentilSoup", servings: 1, extras: [{ id: "egg", qty: 2 }, { id: "breadSlice", qty: 2 }] },
      snack: { recipe: null, servings: 1, extras: [] }
    },
    { // Friday
      breakfast: { recipe: "oatmeal", servings: 1, extras: [{ id: "egg", qty: 2 }] },
      lunch: { recipe: "tunaSandwich", servings: 1 },
      dinner: { recipe: "beefPasta", servings: 1, note: "Cook 2 servings. Save one for Sunday." },
      snack: { recipe: null, servings: 1, extras: [] }
    },
    { // Saturday
      breakfast: { recipe: "eggsToast", servings: 1 },
      lunch: { recipe: "chickenRice", servings: 1, note: "Leftover chicken and rice, cooked Friday evening." },
      dinner: { recipe: "friedRice", servings: 1, note: "Uses rice cooked Friday." },
      snack: { recipe: null, servings: 1, extras: [] }
    },
    { // Sunday
      breakfast: { recipe: "oatmeal", servings: 1, extras: [{ id: "egg", qty: 2 }] },
      lunch: { recipe: "tunaSandwich", servings: 1 },
      dinner: { recipe: "beefPasta", servings: 1, note: "Leftover from Friday. You can switch to the beef and potato skillet." },
      snack: { recipe: null, servings: 1, extras: [] }
    }
  ],

  // Batch cooking notes written for the starting schedule above.
  prepPlan: [
    { day: "Shopping day", text: "Raw chicken and ground beef keep only 1 to 2 days in the fridge. Keep about 17 oz of chicken in the fridge for Monday and freeze the rest. Split one beef pack into two 8 oz freezer bags and freeze both beef packs." },
    { day: "Monday", text: "Cook the chicken for Monday dinner, Tuesday's bowl and Thursday lunch in one batch, plus 1½ cups of dry rice. Refrigerate leftovers within 2 hours." },
    { day: "Tuesday", text: "Move one 8 oz bag of beef from the freezer to the fridge to thaw for Wednesday." },
    { day: "Wednesday", text: "Boil the eggs for the snack. Move the other full beef pack to the fridge for Friday." },
    { day: "Thursday", text: "Make the full pot of lentil soup and freeze the extra portions. Move the remaining chicken to the fridge to thaw." },
    { day: "Friday", text: "Cook 2 servings of beef pasta (one for Sunday). Cook Saturday's chicken and rice plus ½ cup extra dry rice for the fried rice, then chill it." },
    { day: "Saturday and Sunday", text: "Reheat leftovers to 165°F. The spare 8 oz of frozen beef carries into next week." }
  ]
};
