# Kosher Protein Planner

A personal meal-planning dashboard for one person and one week: affordable kosher meals, at least 100 g of protein a day, and a $109 grocery limit that includes tax.

It is a static website (HTML, CSS and plain JavaScript). It needs no server, account, API key or paid service, so it runs on GitHub Pages for free.

## What is in the folder

| File | What it does |
| --- | --- |
| `index.html` | Page structure, navigation and dialogs |
| `style.css` | All styling, including the phone layout and the print layout for the shopping list |
| `script.js` | Calculations, saving and every interactive control |
| `data.js` | The starting data: grocery items, prices, recipes, add-ons and the default week. Edit this to customize |
| `favicon.svg`, `favicon-32.png`, `apple-touch-icon.png` | Site icons |
| `README.md` | This file |

## Publish it on GitHub Pages

You only need a free GitHub account and a web browser.

1. **Create a repository.** Sign in at [github.com](https://github.com), click the **+** in the top right, then **New repository**. Name it something like `meal-planner`, set it to **Public** (free GitHub Pages sites must be public unless you have a paid plan), and click **Create repository**.
2. **Upload the files.** On the new repository's page, click **uploading an existing file** (or **Add file > Upload files**). Drag in all the files from this folder: `index.html`, `style.css`, `script.js`, `data.js`, `favicon.svg`, `favicon-32.png`, `apple-touch-icon.png` and `README.md`. Keep them at the top level, not inside another folder. Click **Commit changes**.
3. **Turn on GitHub Pages.** Open the repository's **Settings** tab, then **Pages** in the left sidebar. Under **Build and deployment**, set **Source** to **Deploy from a branch**. Set **Branch** to `main` and the folder to `/ (root)`, then click **Save**.
4. **Open the site.** Wait a minute or two, then refresh the Pages settings screen. It shows the address, usually `https://YOUR-USERNAME.github.io/meal-planner/`. Open it on your computer or phone. On a phone you can use **Add to Home Screen** to open it like an app.

To update the site later, upload the changed file the same way (GitHub replaces the old one) and wait a minute for Pages to rebuild.

### Try it on your computer first (optional)

Double-clicking `index.html` works in most browsers. If your browser blocks something, run a tiny local server from the folder instead:

```
python3 -m http.server 8000
```

Then open `http://localhost:8000`.

## How the planner works

- **Dashboard:** budget, estimated checkout total, money left, average daily protein, today's meals and a protein bar for each day. Planner settings (start date, budget, protein goal, tax rate and buffer) and the reset button are at the bottom.
- **Weekly Schedule:** Monday to Sunday with breakfast, lunch, dinner, and snacks and additions. Change a meal, adjust servings, add protein extras, swap meals between days, mark meals done and open each recipe. If a day is under the goal, the cheapest add-on that closes the gap is suggested with a one-click button.
- **Recipes:** ten beginner recipes with photos, protein and cost per serving, prep and cook time, scaled ingredients, steps, food safety, storage and kosher classification. You can add any recipe to the schedule or add its missing ingredients to the shopping list.
- **Shopping List:** built from the whole week's schedule. Each ingredient is added up once across all recipes and then rounded up to whole packages, so shared ingredients are never double counted. You can edit prices, enter what you already have, mark items purchased, mark items taxable or not, add, edit and delete items, copy the list as text and print it.
- **Budget Tracker:** subtotal, tax, checkout total, money left, spending by category, cost per serving for each recipe and the daily food cost.

### Rules the math follows

- Protein is calculated from each ingredient's amount in the recipe, so it changes when servings change. Nothing that is not in a recipe is counted.
- Protein values are estimates from typical USDA FoodData Central values and common US labels, rounded down. Meat is listed by raw weight. A day is only marked as reaching the goal when its estimated total is at least the goal. If you check a value against your own package label, edit the item and tick the label box; a day where every protein value is checked shows "label-checked" instead of "est."
- Purchased items still count toward the week's checkout total. Checking an item off does not lower the total.
- Tax is always shown. The default applies the tax rate to every item, which is the cautious choice. Many states do not tax most grocery food, so untick **Taxable** on items your state does not tax.
- A contingency buffer (default $5) is kept aside so the plan does not depend on spending every dollar. You get a warning if the checkout total goes over the budget, and a softer one if it eats into the buffer.
- Prices are starting estimates for US store brands and kosher meat, not live prices. Replace them with your store's prices.

### Reconciled quantities

The starting list in the brief was checked against the seven-day schedule. With the default plan the list needs about 24 oz of beef (2 one-pound packs), 28 oz of chicken (2 lb), 24 eggs (2 dozen), 5 cans of tuna, 1 can of black beans, 1 jar of tomato sauce, 2 bags of frozen vegetables and about half a pound of potatoes. Mayonnaise and soy sauce were added because the tuna sandwich and the fried rice use them. Quantities update automatically when you change the schedule.

## Kosher notes

- Every recipe is labeled **Meat**, **Pareve** or **Pareve (fish)**. No recipe combines meat and dairy, and fish add-ons are never offered on meat meals.
- The planner does not assume any packaged product is kosher. Check the hechsher on tuna, bread (it must be pareve, not dairy), pasta, sauces, oil, spices, soy sauce, mayonnaise and peanut butter, according to your household's standard. None of the recipes use broth; if you add some, it needs certification too.

## Food safety used in the recipes

Chicken is cooked to 165°F, ground beef to 160°F, eggs until firm, and leftovers are reheated to 165°F. Leftovers go in the fridge within 2 hours and keep 3 to 4 days, or 2 to 3 months frozen. Raw chicken and ground beef keep 1 to 2 days in the fridge, so the batch cooking plan on the schedule page says when to freeze and thaw them.

## Customizing

- **Prices, items, recipes and the default week:** edit `data.js`. Each section has a comment explaining the fields. After you change `data.js`, press **Reset planner** on the dashboard (or raise `dataVersion` by 1) so your browser loads the new defaults.
- **Colors and fonts:** change the custom properties at the top of `style.css`.
- **A new week:** use **Start next week** in Planner settings. It moves the dates forward 7 days and clears Done marks and purchased checkmarks, but keeps your meals and prices.

## Where your data is saved

Everything you change is saved in your browser's local storage on that device. Nothing is sent anywhere, and no personal information is collected. Your phone and computer each keep their own copy. Clearing your browser data, or pressing **Reset planner**, restores the starting plan.

## Photo credits

Food photos are from [Unsplash](https://unsplash.com) and are used under the [Unsplash License](https://unsplash.com/license). They load from Unsplash's image servers. If a photo cannot load, a labeled placeholder is shown instead.

| Recipe | Photographer |
| --- | --- |
| Chicken, rice, and vegetables | [Karolina Kołodziejczak](https://unsplash.com/photos/rice-with-sliced-vegetables-on-green-ceramic-plate-84JxtS4vI2A) |
| Tuna sandwich | [Youjeen Cho](https://unsplash.com/photos/sandwich-on-table-sBKLiRiunK0) |
| Tuna pasta with tomato sauce | [Kenneth Mallia](https://unsplash.com/photos/pasta-dish-on-white-ceramic-plate-jJNDQQjJr-Y) |
| Chicken and black bean burrito bowl | [AnaCristina Smith](https://unsplash.com/photos/a-plate-of-chicken-black-beans-corn-and-salsa-cIXQYJ8V0Gw) |
| Beef and potato skillet | [Marlom Veloso](https://unsplash.com/photos/a-bowl-of-food-with-a-spoon-in-it-Y8e1EVwu3lA) |
| Lentil soup | [Steve Tsang](https://unsplash.com/photos/soup-in-maroon-ceramic-pot-MP_A0OK_O60) |
| Chicken and egg fried rice | [herry shani](https://unsplash.com/photos/a-bowl-of-rice-with-vegetables-MVMohJBieo4) |
| Beef pasta with tomato sauce | [Sofia Ciravegna](https://unsplash.com/photos/a-plate-of-spaghetti-with-meat-and-tomato-sauce-khQeenz99H0) |
| Oatmeal with peanut butter and banana | [Dimitris Asproloupos](https://unsplash.com/photos/a-bowl-of-oatmeal-with-banana-slices-on-top-qzRVPgqSWn4) |
| Eggs and toast | [Imad 786](https://unsplash.com/photos/a-fried-egg-and-toast-on-a-plate-zFSwKehUHxg) |

Photos show the general dish and may differ slightly from these exact recipes.

## Disclaimer

Protein figures and prices are planning estimates, not verified nutrition data or live store prices. This planner is not medical or dietary advice.
