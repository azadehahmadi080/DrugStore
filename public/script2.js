
const userId = "<%= userId %>"; // get userId from EJS

async function addToCart(id, image, name, price) {
  console.log("Adding to cart:", id);
  let quantity = parseInt(document.getElementById("quantity").value);

  if (isNaN(quantity) || quantity <= 0) {
    alert("Please enter a valid value for number.");
    return;
  }

  const total = price * quantity;
  const product = { id, image, name, price, quantity, total };

  let cart = JSON.parse(localStorage.getItem("cart")) || [];
  const existingProductIndex = cart.findIndex((item) => item.id === id);

  if (existingProductIndex !== -1) {
    cart[existingProductIndex].quantity += quantity;
    cart[existingProductIndex].total += total;
  } else {
    cart.push(product);
  }

  localStorage.setItem("cart", JSON.stringify(cart));

  //Send request to server to save product in the database
  try {
    await fetch("/cart/add", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ userId, ...product }),
    });
    alert("Product  successfully added to cart.");
    window.location.href = "/cart";
  } catch (error) {
    console.error("Error in adding product to databas:", error);
    alert("Error in adding product to cart.");
  }
}

async function removeFromCart(productId) {
  try {
    const response = await fetch("/cart/remove", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ userId, productId }),
    });

    if (!response.ok) {
      throw new Error("Error to remove the product from the databas.");
    }

    // remove the product of localStorage
    let cart = JSON.parse(localStorage.getItem("cart")) || [];
    cart = cart.filter((item) => item.id !== productId);
    localStorage.setItem("cart", JSON.stringify(cart));

    // Remove the element of DOM
    document.getElementById(`cart-item-${productId}`).remove();
    alert("Product Successfully removed from cart.");
  } catch (error) {
    console.error("Error In Delete Product:", error);
    alert("Error In Delete Product. Please try again.");
  }
}

