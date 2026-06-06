# POS API Documentation

Welcome to the Point of Sale (POS) System API Documentation. This API is built using NestJS and Prisma, providing a robust backend for order management, kitchen order tickets (KOT), inventory, role-based access control (RBAC), and multi-branch operations.

## Base URL
All API requests are routed through:
```
http://<host>:<port>/api/v1
```

## Authentication
Most endpoints require a JSON Web Token (JWT) passed in the HTTP Authorization header:
```http
Authorization: Bearer <your_jwt_token>
```

---

## API Documentation Resources

Choose a resource category below to view detailed endpoints, request parameters, and response structures:

*   [🔐 Authentication & Session](#-authentication-api) - Sign-in and current user session validation.
*   [🏢 Branch Management](#-branch-management-api) - Centralized and branch lookup management.
*   [📁 Category Management](#-category-management-api) - Menu category listing, creation, and deletion.
*   [🍔 Product Inventory](#-product-inventory-api) - Product CRUD and image uploads.
*   [👥 Role Management](#-role-management-api) - Custom Roles and permission mapping.
*   [👤 User Accounts](#-user-accounts-api) - User accounts, credentials, and branch assignments.
*   [🛒 Order Processing](#-order-processing-api) - Complete order creation and updates (Append-Only architecture).
*   [🍳 Kitchen Order Tickets (KOT)](#-kitchen-order-tickets-kot-api) - KOT lifecycle updates and kitchen tracking.
*   [📊 Dashboard Metrics](#-dashboard-metrics-api) - Quick stats for managers and branch staff.
*   [📈 Analytics Reports](#-analytics-reports-api) - Daily, weekly, monthly, and yearly branch sales performance.
*   [🔑 Permissions](#-permissions-api) - Fetch module-grouped system permissions.
*   [⚙️ System Endpoints](#-system-endpoints-api) - Health checks and basic system utilities.

---

## 🔐 Authentication API

Endpoints under `/auth` handle user login sessions and retrieve user profile permissions.

---

### 1. User Login
Authenticates user credentials and generates a JWT access token.

*   **URL:** `/api/v1/auth/login`
*   **Method:** `POST`
*   **Auth Required:** No

#### Request Body
| Field | Type | Required | Description |
| :--- | :--- | :--- | :--- |
| `email` | `string` | Yes | Valid email address format |
| `password` | `string` | Yes | Plain text password |

##### Example Request Payload
```json
{
  "email": "admin@example.com",
  "password": "password123"
}
```

#### Response (201 Created)
Returns a confirmation message, the JWT authorization token, and profile summary.

##### Example Response Body
```json
{
  "message": "Login Successful",
  "accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "data": {
    "id": "c1a2e9b0-9f05-4c07-ba79-11c76cd0a38b",
    "name": "Jane Doe",
    "email": "admin@example.com",
    "role": "ADMIN",
    "branchId": "e3f08ca7-bfd2-43bb-a4ab-734f19b21f31",
    "branchName": "Downtown Branch"
  }
}
```

#### Errors
| Status Code | Message | Description |
| :--- | :--- | :--- |
| `401 Unauthorized` | `Invalid credentials` | Email or password does not match any registered user. |

---

### 2. Get Authenticated User Details
Retrieves the logged-in user profile details, active roles, and complete grouped permissions/module access hierarchy.

*   **URL:** `/api/v1/auth/me`
*   **Method:** `GET`
*   **Auth Required:** Yes (Bearer Token)

#### Headers
```http
Authorization: Bearer <token>
```

#### Response (200 OK)
Returns a structure containing the user information and nested modules corresponding to their permissions.

##### Example Response Body
```json
{
  "id": "c1a2e9b0-9f05-4c07-ba79-11c76cd0a38b",
  "email": "admin@example.com",
  "role": "ADMIN",
  "modules": [
    {
      "id": "fb629d8a-9a9c-4613-bc78-65123d47c438",
      "name": "Order Management",
      "key": "orders",
      "order": 1,
      "icon": "shopping-cart",
      "url": "/orders",
      "parentId": null,
      "permissions": [
        {
          "id": "4da422b4-7b44-42f2-bd53-0c4e0f0bd023",
          "key": "order:create",
          "description": "Allows creating restaurant orders"
        },
        {
          "id": "7b0b2321-df62-4b2a-8ff4-934c2b9a32c2",
          "key": "order:view",
          "description": "Allows viewing order list and details"
        }
      ],
      "children": []
    }
  ]
}
```

#### Errors
| Status Code | Message | Description |
| :--- | :--- | :--- |
| `401 Unauthorized` | `Unauthorized` | Missing, expired, or invalid JWT token in headers. |
| `404 Not Found` | `Role not found` | The user is valid but does not have a role associated in the database. |

---

## 🏢 Branch Management API

Endpoints under `/branches` handle creating, updating, listing, and lookup operations for multi-branch environments.

---

### 1. Branch Public Lookup
Fetches a list of all branches for login lookup menus. No authentication required.

*   **URL:** `/api/v1/branches/lookup`
*   **Method:** `GET`
*   **Auth Required:** No

#### Response (200 OK)
```json
{
  "message": "Public branches fetched successfully",
  "data": [
    {
      "id": "e3f08ca7-bfd2-43bb-a4ab-734f19b21f31",
      "name": "Downtown Branch",
      "createdAt": "2026-06-05T08:00:00.000Z"
    },
    {
      "id": "fb64c8c7-4321-4fde-ba41-a1e4d3a242f3",
      "name": "Westside Branch",
      "createdAt": "2026-06-04T12:00:00.000Z"
    }
  ]
}
```

---

### 2. List Branches (Paginated)
Lists all branches with pagination support. Restricted to `ADMIN` role.

*   **URL:** `/api/v1/branches`
*   **Method:** `GET`
*   **Auth Required:** Yes (JWT + Role: `ADMIN`)

#### Query Parameters
| Parameter | Type | Required | Default | Description |
| :--- | :--- | :--- | :--- | :--- |
| `page` | `number` | No | `1` | Page number to retrieve (Minimum: `1`) |
| `limit` | `number` | No | `10` | Number of records per page (Maximum: `100`) |

#### Response (200 OK)
```json
{
  "message": "Branches fetched successfully",
  "data": [
    {
      "id": "e3f08ca7-bfd2-43bb-a4ab-734f19b21f31",
      "name": "Downtown Branch",
      "createdAt": "2026-06-05T08:00:00.000Z"
    }
  ],
  "meta": {
    "total": 12,
    "page": 1,
    "limit": 10,
    "totalPages": 2
  }
}
```

---

### 3. Find Branch by ID
Retrieves details of a single branch by its UUID. Restricted to `ADMIN` role.

*   **URL:** `/api/v1/branches/:id`
*   **Method:** `GET`
*   **Auth Required:** Yes (JWT + Role: `ADMIN`)

#### Path Parameters
*   `id` (UUID format, required) - The unique ID of the branch.

#### Response (200 OK)
```json
{
  "message": "Branch fetched successfully",
  "data": {
    "id": "e3f08ca7-bfd2-43bb-a4ab-734f19b21f31",
    "name": "Downtown Branch",
    "createdAt": "2026-06-05T08:00:00.000Z"
  }
}
```

#### Errors
| Status Code | Message | Description |
| :--- | :--- | :--- |
| `400 Bad Request` | `Validation failed (uuid v 4 is expected)` | The provided path parameter is not a valid UUID. |
| `404 Not Found` | `Branch not found` | No branch exists with the given ID. |

---

### 4. Add New Branch
Creates a new branch. Restricted to `ADMIN` role.

*   **URL:** `/api/v1/branches`
*   **Method:** `POST`
*   **Auth Required:** Yes (JWT + Role: `ADMIN`)

#### Request Body
| Field | Type | Required | Description |
| :--- | :--- | :--- | :--- |
| `name` | `string` | Yes | Name of the branch. Must be non-empty. |

##### Example Payload
```json
{
  "name": "Northside Diner"
}
```

#### Response (201 Created)
```json
{
  "message": "Branch created successfully",
  "data": {
    "id": "2c510b64-fd18-4720-bdde-97e3a19b8cf1",
    "name": "Northside Diner",
    "createdAt": "2026-06-05T08:30:00.000Z"
  }
}
```

---

### 5. Update Branch
Updates a branch name. Restricted to `ADMIN` role.

*   **URL:** `/api/v1/branches/:id`
*   **Method:** `PATCH`
*   **Auth Required:** Yes (JWT + Role: `ADMIN`)

#### Path Parameters
*   `id` (UUID format, required) - The unique ID of the branch.

#### Request Body
| Field | Type | Required | Description |
| :--- | :--- | :--- | :--- |
| `name` | `string` | Yes | New name of the branch. Must be non-empty. |

##### Example Payload
```json
{
  "name": "Northside Diner Express"
}
```

#### Response (200 OK)
```json
{
  "message": "Branch updated successfully",
  "data": {
    "id": "2c510b64-fd18-4720-bdde-97e3a19b8cf1",
    "name": "Northside Diner Express",
    "createdAt": "2026-06-05T08:30:00.000Z"
  }
}
```

#### Errors
| Status Code | Message | Description |
| :--- | :--- | :--- |
| `404 Not Found` | `Branch not found` | The target branch does not exist or has been deleted. |

---

### 6. Delete Branch
Deletes a branch by ID. Restricted to `ADMIN` role.

*   **URL:** `/api/v1/branches/:id`
*   **Method:** `DELETE`
*   **Auth Required:** Yes (JWT + Role: `ADMIN`)

#### Path Parameters
*   `id` (UUID format, required) - The unique ID of the branch.

#### Response (200 OK)
```json
{
  "message": "Branch deleted successfully",
  "data": {
    "id": "2c510b64-fd18-4720-bdde-97e3a19b8cf1",
    "name": "Northside Diner Express",
    "createdAt": "2026-06-05T08:30:00.000Z"
  }
}
```

---

## 📁 Category Management API

Endpoints under `/categories` handle CRUD operations for menu categories.

---

### 1. Category Public Lookup
Fetches a list of all categories for dropdown menus. No authentication required.

*   **URL:** `/api/v1/categories/lookup`
*   **Method:** `GET`
*   **Auth Required:** No

#### Response (200 OK)
```json
{
  "message": "Public categories fetched successfully",
  "data": [
    {
      "id": "a1b2c3d4-e5f6-7a8b-9c0d-1e2f3a4b5c6d",
      "name": "Beverages",
      "createdAt": "2026-06-05T08:00:00.000Z"
    },
    {
      "id": "e9876f2d-8384-47b2-bd77-df8203f191b2",
      "name": "Appetizers",
      "createdAt": "2026-06-05T08:05:00.000Z"
    }
  ]
}
```

---

### 2. List Categories (Paginated)
Lists all categories with pagination support. Restricted to `ADMIN` role.

*   **URL:** `/api/v1/categories`
*   **Method:** `GET`
*   **Auth Required:** Yes (JWT + Role: `ADMIN`)

#### Query Parameters
| Parameter | Type | Required | Default | Description |
| :--- | :--- | :--- | :--- | :--- |
| `page` | `number` | No | `1` | Page number to retrieve (Minimum: `1`) |
| `limit` | `number` | No | `10` | Number of records per page (Maximum: `100`) |

#### Response (200 OK)
```json
{
  "message": "Categories fetched successfully",
  "data": [
    {
      "id": "a1b2c3d4-e5f6-7a8b-9c0d-1e2f3a4b5c6d",
      "name": "Beverages",
      "isActive": true,
      "createdAt": "2026-06-05T08:00:00.000Z"
    }
  ],
  "meta": {
    "total": 5,
    "page": 1,
    "limit": 10,
    "totalPages": 1
  }
}
```

---

### 3. Find Category by ID
Retrieves details of a single category by its UUID. Restricted to `ADMIN` role.

*   **URL:** `/api/v1/categories/:id`
*   **Method:** `GET`
*   **Auth Required:** Yes (JWT + Role: `ADMIN`)

#### Path Parameters
*   `id` (UUID format, required) - The unique ID of the category.

#### Response (200 OK)
```json
{
  "message": "Category fetched successfully",
  "data": {
    "id": "a1b2c3d4-e5f6-7a8b-9c0d-1e2f3a4b5c6d",
    "name": "Beverages",
    "isActive": true,
    "createdAt": "2026-06-05T08:00:00.000Z"
  }
}
```

---

### 4. Add New Category
Creates a new menu category. Restricted to `ADMIN` role.

*   **URL:** `/api/v1/categories`
*   **Method:** `POST`
*   **Auth Required:** Yes (JWT + Role: `ADMIN`)

#### Request Body
| Field | Type | Required | Description |
| :--- | :--- | :--- | :--- |
| `name` | `string` | Yes | Name of the category. Must be non-empty. |
| `isActive` | `boolean` | Yes | Toggle status of the category. |

##### Example Payload
```json
{
  "name": "Main Course",
  "isActive": true
}
```

#### Response (201 Created)
```json
{
  "message": "Category created successfully",
  "data": {
    "id": "7b0b2321-df62-4b2a-8ff4-934c2b9a32c2",
    "name": "Main Course",
    "isActive": true,
    "createdAt": "2026-06-05T08:45:00.000Z"
  }
}
```

---

### 5. Update Category
Updates an existing category. Restricted to `ADMIN` role.

*   **URL:** `/api/v1/categories/:id`
*   **Method:** `PATCH`
*   **Auth Required:** Yes (JWT + Role: `ADMIN`)

#### Path Parameters
*   `id` (UUID format, required) - The unique ID of the category.

#### Request Body
| Field | Type | Required | Description |
| :--- | :--- | :--- | :--- |
| `name` | `string` | Yes | Name of the category. Must be non-empty. |
| `isActive` | `boolean` | Yes | Toggle status of the category. |

##### Example Payload
```json
{
  "name": "Main Courses & Grills",
  "isActive": false
}
```

#### Response (200 OK)
```json
{
  "message": "Category updated successfully",
  "data": {
    "id": "7b0b2321-df62-4b2a-8ff4-934c2b9a32c2",
    "name": "Main Courses & Grills",
    "isActive": false,
    "createdAt": "2026-06-05T08:45:00.000Z"
  }
}
```

---

### 6. Delete Category
Deletes a category by ID. Restricted to `ADMIN` role.

*   **URL:** `/api/v1/categories/:id`
*   **Method:** `DELETE`
*   **Auth Required:** Yes (JWT + Role: `ADMIN`)

#### Path Parameters
*   `id` (UUID format, required) - The unique ID of the category.

#### Response (200 OK)
```json
{
  "message": "Category deleted successfully",
  "data": {
    "id": "7b0b2321-df62-4b2a-8ff4-934c2b9a32c2",
    "name": "Main Courses & Grills",
    "isActive": false,
    "createdAt": "2026-06-05T08:45:00.000Z"
  }
}
```

> [!NOTE]
> Deletion is protected by a Deletion Relation Guard. If a category is linked to active products, the request may fail depending on the deletion rules configured.

---

## 🍔 Product Inventory API

Endpoints under `/products` handle menu item creation, update, deletion, listing, filtering, and image upload.

---

### 1. Product Public Lookup
Fetches a list of all products for basic dropdown select menus. No authentication required.

*   **URL:** `/api/v1/products/lookup`
*   **Method:** `GET`
*   **Auth Required:** No

#### Response (200 OK)
```json
{
  "message": "Public products fetched successfully",
  "data": [
    {
      "id": "22bcda17-21a4-4df8-92a1-faee98c25cf6",
      "name": "Cheese Burger",
      "createdAt": "2026-06-05T08:00:00.000Z"
    }
  ]
}
```

---

### 2. Get Products by Category
Fetches products filtered by category ID. Requires user login session.

*   **URL:** `/api/v1/products/category`
*   **Method:** `GET`
*   **Auth Required:** Yes (JWT)

#### Query Parameters
| Parameter | Type | Required | Description |
| :--- | :--- | :--- | :--- |
| `category_id` | `string` | Yes | Category UUID to filter products. |

#### Response (200 OK)
```json
{
  "message": "Category products fetched successfully",
  "data": [
    {
      "id": "22bcda17-21a4-4df8-92a1-faee98c25cf6",
      "name": "Cheese Burger",
      "image": "https://res.cloudinary.com/.../burger.jpg",
      "imagePublicId": "products/burger",
      "categoryId": "a1b2c3d4-e5f6-7a8b-9c0d-1e2f3a4b5c6d",
      "category": {
        "id": "a1b2c3d4-e5f6-7a8b-9c0d-1e2f3a4b5c6d",
        "name": "Fast Food"
      },
      "isKotRequired": true,
      "price": 8.99,
      "isActive": true,
      "createdAt": "2026-06-05T08:00:00.000Z"
    }
  ]
}
```

---

### 3. List Products (Paginated)
Lists all products with pagination support. Restricted to `ADMIN` role.

*   **URL:** `/api/v1/products`
*   **Method:** `GET`
*   **Auth Required:** Yes (JWT + Role: `ADMIN`)

#### Query Parameters
| Parameter | Type | Required | Default | Description |
| :--- | :--- | :--- | :--- | :--- |
| `page` | `number` | No | `1` | Page number to retrieve (Minimum: `1`) |
| `limit` | `number` | No | `10` | Number of records per page (Maximum: `100`) |

#### Response (200 OK)
```json
{
  "message": "Products fetched successfully",
  "data": [
    {
      "id": "22bcda17-21a4-4df8-92a1-faee98c25cf6",
      "name": "Cheese Burger",
      "categoryId": "a1b2c3d4-e5f6-7a8b-9c0d-1e2f3a4b5c6d",
      "image": "https://res.cloudinary.com/.../burger.jpg",
      "imagePublicId": "products/burger",
      "category": {
        "id": "a1b2c3d4-e5f6-7a8b-9c0d-1e2f3a4b5c6d",
        "name": "Fast Food"
      },
      "isKotRequired": true,
      "price": 8.99,
      "isActive": true,
      "createdAt": "2026-06-05T08:00:00.000Z"
    }
  ],
  "meta": {
    "total": 35,
    "page": 1,
    "limit": 10,
    "totalPages": 4
  }
}
```

---

### 4. Find Product by ID
Retrieves details of a single product. Restricted to `ADMIN` role.

*   **URL:** `/api/v1/products/:id`
*   **Method:** `GET`
*   **Auth Required:** Yes (JWT + Role: `ADMIN`)

#### Path Parameters
*   `id` (UUID format, required) - The unique ID of the product.

#### Response (200 OK)
```json
{
  "message": "Product fetched successfully",
  "data": {
    "id": "22bcda17-21a4-4df8-92a1-faee98c25cf6",
    "name": "Cheese Burger",
    "categoryId": "a1b2c3d4-e5f6-7a8b-9c0d-1e2f3a4b5c6d",
    "image": "https://res.cloudinary.com/.../burger.jpg",
    "imagePublicId": "products/burger",
    "category": {
      "id": "a1b2c3d4-e5f6-7a8b-9c0d-1e2f3a4b5c6d",
      "name": "Fast Food"
    },
    "isKotRequired": true,
    "price": 8.99,
    "isActive": true,
    "createdAt": "2026-06-05T08:00:00.000Z"
  }
}
```

---

### 5. Add New Product
Creates a new product in the inventory. Restricted to `ADMIN` role.

*   **URL:** `/api/v1/products`
*   **Method:** `POST`
*   **Auth Required:** Yes (JWT + Role: `ADMIN`)

#### Request Body
| Field | Type | Required | Description |
| :--- | :--- | :--- | :--- |
| `name` | `string` | Yes | Name of the product. |
| `isActive` | `boolean` | Yes | Toggle status of the product. |
| `isKotRequired` | `boolean` | Yes | True if the product requires sending a Kitchen Order Ticket (KOT) to the kitchen. |
| `price` | `number` | Yes | Selling price of the item. |
| `categoryId` | `string` | Yes | Category UUID to link the product to. |

##### Example Payload
```json
{
  "name": "Chocolate Milkshake",
  "isActive": true,
  "isKotRequired": false,
  "price": 4.50,
  "categoryId": "a1b2c3d4-e5f6-7a8b-9c0d-1e2f3a4b5c6d"
}
```

#### Response (201 Created)
```json
{
  "message": "Product created successfully",
  "data": {
    "id": "9d7e5f3c-1b6a-4933-8a3a-18bcf932c021",
    "name": "Chocolate Milkshake",
    "categoryId": "a1b2c3d4-e5f6-7a8b-9c0d-1e2f3a4b5c6d",
    "image": null,
    "imagePublicId": null,
    "category": {
      "id": "a1b2c3d4-e5f6-7a8b-9c0d-1e2f3a4b5c6d",
      "name": "Beverages"
    },
    "isKotRequired": false,
    "price": 4.50,
    "isActive": true,
    "createdAt": "2026-06-05T09:00:00.000Z"
  }
}
```

---

### 6. Update Product
Updates an existing product's fields. All fields are required in the payload. Restricted to `ADMIN` role.

*   **URL:** `/api/v1/products/:id`
*   **Method:** `PATCH`
*   **Auth Required:** Yes (JWT + Role: `ADMIN`)

#### Path Parameters
*   `id` (UUID format, required) - The unique ID of the product.

#### Request Body
Same schema as the **Add New Product** body.

##### Example Payload
```json
{
  "name": "Premium Chocolate Milkshake",
  "isActive": true,
  "isKotRequired": false,
  "price": 5.20,
  "categoryId": "a1b2c3d4-e5f6-7a8b-9c0d-1e2f3a4b5c6d"
}
```

#### Response (200 OK)
```json
{
  "message": "Product updated successfully",
  "data": {
    "id": "9d7e5f3c-1b6a-4933-8a3a-18bcf932c021",
    "name": "Premium Chocolate Milkshake",
    "categoryId": "a1b2c3d4-e5f6-7a8b-9c0d-1e2f3a4b5c6d",
    "image": null,
    "imagePublicId": null,
    "category": {
      "id": "a1b2c3d4-e5f6-7a8b-9c0d-1e2f3a4b5c6d",
      "name": "Beverages"
    },
    "isKotRequired": false,
    "price": 5.20,
    "isActive": true,
    "createdAt": "2026-06-05T09:00:00.000Z"
  }
}
```

---

### 7. Delete Product
Removes a product from the database. Restricted to `ADMIN` role.

*   **URL:** `/api/v1/products/:id`
*   **Method:** `DELETE`
*   **Auth Required:** Yes (JWT + Role: `ADMIN`)

#### Path Parameters
*   `id` (UUID format, required) - The unique ID of the product.

#### Response (200 OK)
```json
{
  "message": "Product deleted successfully",
  "data": {
    "id": "9d7e5f3c-1b6a-4933-8a3a-18bcf932c021",
    "name": "Premium Chocolate Milkshake",
    "categoryId": "a1b2c3d4-e5f6-7a8b-9c0d-1e2f3a4b5c6d",
    "image": null,
    "imagePublicId": null,
    "isKotRequired": false,
    "price": 5.20,
    "isActive": true,
    "createdAt": "2026-06-05T09:00:00.000Z"
  }
}
```

---

### 8. Upload Product Image
Uploads a product image binary to Cloudinary. Restricted to `ADMIN` role.

*   **URL:** `/api/v1/products/upload`
*   **Method:** `POST`
*   **Auth Required:** Yes (JWT + Role: `ADMIN`)
*   **Content-Type:** `multipart/form-data`

#### Form Data
*   `file` (file upload binary, required) - The image file to be uploaded.

#### Response (201 Created)
Returns the secure URL and Cloudinary public ID for the uploaded image file. This info can be linked when adding or updating a product.

##### Example Response Body
```json
{
  "url": "https://res.cloudinary.com/demo/image/upload/v1234567890/products/sample.jpg",
  "public_id": "products/sample"
}
```

---

## 👥 Role Management API

Endpoints under `/roles` manage Custom Roles, soft-deletion of roles, and granular permission mapping for Role-Based Access Control (RBAC).

---

### 1. List Roles (Paginated)
Lists all active roles in the system. Soft-deleted roles are excluded. Restricted to `ADMIN` role.

*   **URL:** `/api/v1/roles`
*   **Method:** `GET`
*   **Auth Required:** Yes (JWT + Role: `ADMIN`)

#### Query Parameters
| Parameter | Type | Required | Default | Description |
| :--- | :--- | :--- | :--- | :--- |
| `page` | `number` | No | `1` | Page number to retrieve (Minimum: `1`) |
| `limit` | `number` | No | `10` | Number of records per page (Maximum: `100`) |

#### Response (200 OK)
```json
{
  "message": "roles fetched successfully",
  "data": [
    {
      "id": "18f93db2-cf05-4c07-ba79-11c76cd0a38b",
      "name": "CASHIER",
      "createdAt": "2026-06-05T08:00:00.000Z",
      "updatedAt": "2026-06-05T08:00:00.000Z",
      "deletedAt": null
    }
  ],
  "meta": {
    "total": 3,
    "page": 1,
    "limit": 10,
    "totalPages": 1
  }
}
```

---

### 2. Find Role by ID
Retrieves details of a single role, including a fully built hierarchical menu structure (`permissionsByModule`) representing their permissions grouped under parent/child modules. Restricted to `ADMIN` role.

*   **URL:** `/api/v1/roles/:id`
*   **Method:** `GET`
*   **Auth Required:** Yes (JWT + Role: `ADMIN`)

#### Path Parameters
*   `id` (UUID format, required) - The unique ID of the role.

#### Response (200 OK)
```json
{
  "message": "role fetched successfully",
  "data": {
    "id": "18f93db2-cf05-4c07-ba79-11c76cd0a38b",
    "name": "CASHIER",
    "createdAt": "2026-06-05T08:00:00.000Z",
    "updatedAt": "2026-06-05T08:00:00.000Z",
    "deletedAt": null,
    "permissions": [
      {
        "permissionId": "4da422b4-7b44-42f2-bd53-0c4e0f0bd023",
        "permission": {
          "id": "4da422b4-7b44-42f2-bd53-0c4e0f0bd023",
          "key": "order:create",
          "description": "Create new orders",
          "module": {
            "id": "fb629d8a-9a9c-4613-bc78-65123d47c438",
            "name": "Order Management",
            "key": "orders",
            "order": 1,
            "parentId": null
          }
        }
      }
    ],
    "permissionsByModule": [
      {
        "id": "fb629d8a-9a9c-4613-bc78-65123d47c438",
        "name": "Order Management",
        "key": "orders",
        "order": 1,
        "parentId": null,
        "permissions": [
          {
            "id": "4da422b4-7b44-42f2-bd53-0c4e0f0bd023",
            "key": "order:create",
            "description": "Create new orders"
          }
        ],
        "children": []
      }
    ]
  }
}
```

---

### 3. Create Custom Role
Creates a new role and maps its permission IDs. Restricted to `ADMIN` role.

*   **URL:** `/api/v1/roles`
*   **Method:** `POST`
*   **Auth Required:** Yes (JWT + Role: `ADMIN`)

#### Request Body
| Field | Type | Required | Description |
| :--- | :--- | :--- | :--- |
| `name` | `string` | Yes | Name of the role (e.g. `KITCHEN_STAFF`). |
| `permissionIds` | `string[]` | Yes | List of UUIDs of system permissions. Cannot be empty. |

##### Example Payload
```json
{
  "name": "MANAGER",
  "permissionIds": [
    "4da422b4-7b44-42f2-bd53-0c4e0f0bd023",
    "7b0b2321-df62-4b2a-8ff4-934c2b9a32c2"
  ]
}
```

#### Response (201 Created)
```json
{
  "message": "role created successfully",
  "data": {
    "id": "cf64c2d7-9524-4fde-ba41-a1e4d3a242f3",
    "name": "MANAGER",
    "createdAt": "2026-06-05T09:15:00.000Z",
    "updatedAt": "2026-06-05T09:15:00.000Z",
    "deletedAt": null,
    "permissions": [
      {
        "id": "role-perm-mapping-uuid-1",
        "roleId": "cf64c2d7-9524-4fde-ba41-a1e4d3a242f3",
        "permissionId": "4da422b4-7b44-42f2-bd53-0c4e0f0bd023",
        "permission": {
          "id": "4da422b4-7b44-42f2-bd53-0c4e0f0bd023",
          "key": "order:create",
          "description": "Create new orders"
        }
      }
    ]
  }
}
```

#### Errors
| Status Code | Message | Description |
| :--- | :--- | :--- |
| `404 Not Found` | `Permission not found: <id>` | One or more of the specified permission IDs do not exist in the database. |

---

### 4. Update Role
Updates a role name and replaces its permission mappings. Restricted to `ADMIN` role.

*   **URL:** `/api/v1/roles/:id`
*   **Method:** `PATCH`
*   **Auth Required:** Yes (JWT + Role: `ADMIN`)

#### Path Parameters
*   `id` (UUID format, required) - The unique ID of the role.

#### Request Body
| Field | Type | Required | Description |
| :--- | :--- | :--- | :--- |
| `name` | `string` | No | Updated name of the role. |
| `permissionIds` | `string[]` | No | Replaced list of permission UUIDs. (Passing an empty array clears all permissions). |

##### Example Payload
```json
{
  "name": "ASSISTANT_MANAGER",
  "permissionIds": [
    "4da422b4-7b44-42f2-bd53-0c4e0f0bd023"
  ]
}
```

#### Response (200 OK)
```json
{
  "message": "role updated successfully",
  "data": {
    "id": "cf64c2d7-9524-4fde-ba41-a1e4d3a242f3",
    "name": "ASSISTANT_MANAGER",
    "createdAt": "2026-06-05T09:15:00.000Z",
    "updatedAt": "2026-06-05T09:20:00.000Z",
    "deletedAt": null,
    "permissions": [
      {
        "id": "role-perm-mapping-uuid-1",
        "permissionId": "4da422b4-7b44-42f2-bd53-0c4e0f0bd023",
        "permission": {
          "id": "4da422b4-7b44-42f2-bd53-0c4e0f0bd023",
          "key": "order:create"
        }
      }
    ]
  }
}
```

---

### 5. Delete Role (Soft-Delete)
Marks a role as deleted by updating its `deletedAt` timestamp. Restricted to `ADMIN` role.

*   **URL:** `/api/v1/roles/:id`
*   **Method:** `DELETE`
*   **Auth Required:** Yes (JWT + Role: `ADMIN`)

#### Path Parameters
*   `id` (UUID format, required) - The unique ID of the role.

#### Response (200 OK)
```json
{
  "message": "Role deleted successfully",
  "data": {
    "id": "cf64c2d7-9524-4fde-ba41-a1e4d3a242f3",
    "name": "ASSISTANT_MANAGER",
    "createdAt": "2026-06-05T09:15:00.000Z",
    "updatedAt": "2026-06-05T09:20:00.000Z",
    "deletedAt": "2026-06-05T09:25:00.000Z"
  }
}
```

---

## 👤 User Accounts API

Endpoints under `/users` manage staff user profiles, passwords, branch assignments, and roles.

---

### 1. List Users (Paginated)
Lists all registered users in the database, along with their assigned branch and role.

*   **URL:** `/api/v1/users`
*   **Method:** `GET`
*   **Auth Required:** Yes (JWT)

#### Query Parameters
| Parameter | Type | Required | Default | Description |
| :--- | :--- | :--- | :--- | :--- |
| `page` | `number` | No | `1` | Page number to retrieve (Minimum: `1`) |
| `limit` | `number` | No | `10` | Number of records per page (Maximum: `100`) |

#### Response (200 OK)
```json
{
  "message": "Users fetched successfully",
  "data": [
    {
      "id": "e4b3c9f2-21a4-4df8-92a1-faee98c25cf6",
      "email": "cashier1@example.com",
      "name": "Alex Cashier",
      "roleId": "18f93db2-cf05-4c07-ba79-11c76cd0a38b",
      "role": {
        "id": "18f93db2-cf05-4c07-ba79-11c76cd0a38b",
        "name": "CASHIER"
      },
      "branchId": "e3f08ca7-bfd2-43bb-a4ab-734f19b21f31",
      "branch": {
        "id": "e3f08ca7-bfd2-43bb-a4ab-734f19b21f31",
        "name": "Downtown Branch"
      }
    }
  ],
  "meta": {
    "page": 1,
    "limit": 10,
    "total": 15,
    "totalPages": 2
  }
}
```

---

### 2. Find User by ID
Retrieves details of a single user by ID. Returns assigned branch, role details, and permission mappings.

*   **URL:** `/api/v1/users/:id`
*   **Method:** `GET`
*   **Auth Required:** Yes (JWT)

#### Path Parameters
*   `id` (UUID format, required) - The unique ID of the user.

#### Response (200 OK)
```json
{
  "message": "User fetched successfully",
  "data": {
    "id": "e4b3c9f2-21a4-4df8-92a1-faee98c25cf6",
    "email": "cashier1@example.com",
    "name": "Alex Cashier",
    "branchId": "e3f08ca7-bfd2-43bb-a4ab-734f19b21f31",
    "branch": {
      "id": "e3f08ca7-bfd2-43bb-a4ab-734f19b21f31",
      "name": "Downtown Branch",
      "createdAt": "2026-06-05T08:00:00.000Z"
    },
    "roleId": "18f93db2-cf05-4c07-ba79-11c76cd0a38b",
    "role": {
      "id": "18f93db2-cf05-4c07-ba79-11c76cd0a38b",
      "name": "CASHIER",
      "permissions": [
        {
          "permissionId": "4da422b4-7b44-42f2-bd53-0c4e0f0bd023"
        }
      ]
    }
  }
}
```

---

### 3. Create User Account
Registers a new user and hashes their password.

*   **URL:** `/api/v1/users`
*   **Method:** `POST`
*   **Auth Required:** Yes (JWT)

#### Request Body
| Field | Type | Required | Description |
| :--- | :--- | :--- | :--- |
| `name` | `string` | Yes | Display name of the user. |
| `email` | `string` | Yes | Valid email address format. Must be unique. |
| `password` | `string` | Yes | User password. Minimum length of 6 characters. |
| `roleId` | `string` | Yes | Valid role UUID. |
| `branchId` | `string` | No | Valid branch UUID (optional). |

##### Example Payload
```json
{
  "name": "John Cook",
  "email": "chef1@example.com",
  "password": "secretChef123",
  "roleId": "18f93db2-cf05-4c07-ba79-11c76cd0a38b",
  "branchId": "e3f08ca7-bfd2-43bb-a4ab-734f19b21f31"
}
```

#### Response (201 Created)
```json
{
  "message": "user created successfully",
  "data": {
    "id": "5fa23d8a-9a9c-4613-bc78-65123d47c438",
    "email": "chef1@example.com",
    "name": "John Cook",
    "roleId": "18f93db2-cf05-4c07-ba79-11c76cd0a38b"
  }
}
```

#### Errors
| Status Code | Message | Description |
| :--- | :--- | :--- |
| `409 Conflict` | `Email already registered` | A user with the provided email address already exists. |
| `404 Not Found` | `role not found` | The specified `roleId` is invalid or refers to a deleted role. |

---

### 4. Update User Account
Updates user profile fields. All fields are optional.

*   **URL:** `/api/v1/users/:id`
*   **Method:** `PATCH`
*   **Auth Required:** Yes (JWT)

#### Path Parameters
*   `id` (UUID format, required) - The unique ID of the user.

#### Request Body
| Field | Type | Required | Description |
| :--- | :--- | :--- | :--- |
| `name` | `string` | No | Updated display name. |
| `email` | `string` | No | Updated email address. |
| `password` | `string` | No | Updated password (minimum length of 6 characters). |
| `roleId` | `string` | No | Updated role UUID. |
| `branchId` | `string` | No | Updated branch UUID. |

##### Example Payload
```json
{
  "name": "Chef John Cook",
  "password": "newSecretChef123"
}
```

#### Response (200 OK)
```json
{
  "message": "User updated successfully",
  "data": {
    "id": "5fa23d8a-9a9c-4613-bc78-65123d47c438",
    "email": "chef1@example.com",
    "name": "Chef John Cook",
    "roleId": "18f93db2-cf05-4c07-ba79-11c76cd0a38b",
    "branchId": "e3f08ca7-bfd2-43bb-a4ab-734f19b21f31"
  }
}
```

---

### 5. Delete User Account
Deletes a user account from the database.

*   **URL:** `/api/v1/users/:id`
*   **Method:** `DELETE`
*   **Auth Required:** Yes (JWT)

#### Path Parameters
*   `id` (UUID format, required) - The unique ID of the user.

#### Response (200 OK)
```json
{
  "message": "User deleted successfully"
}
```

---

## 🛒 Order Processing API

Endpoints under `/orders` manage customer orders, bill calculations, payments, and kitchen order ticket (KOT) propagation.

---

### 💡 Append-Only POS Architecture
To handle restaurant operations smoothly:
1.  **Preserve Kitchen History:** Existing KOTs are never modified when updating an order.
2.  **Separate New Items:** Adding items to an existing order appends items to the bill history and automatically generates a **new separate KOT** for the newly added kitchen items.
3.  **Automatic Status Propagation:** KOT status updates propagate to calculate the overall order status (`PENDING`, `PREPARING`, `READY`, `COMPLETED`).

---

### 1. Order Public Lookup
Fetches all orders sorted by creation time. No authentication required.

*   **URL:** `/api/v1/orders/lookup`
*   **Method:** `GET`
*   **Auth Required:** No

#### Response (200 OK)
```json
{
  "message": "Public Orders fetched successfully",
  "data": [
    {
      "id": "7b0b2321-df62-4b2a-8ff4-934c2b9a32c2",
      "billNo": "INV-1001",
      "totalAmount": 15.50,
      "subTotal": 15.50,
      "discountAmount": 0,
      "taxAmount": 0,
      "paymentMethod": "CASH",
      "status": "PENDING",
      "paymentStatus": "PENDING",
      "notes": "No onions",
      "branchId": "e3f08ca7-bfd2-43bb-a4ab-734f19b21f31",
      "userId": "e4b3c9f2-21a4-4df8-92a1-faee98c25cf6",
      "createdAt": "2026-06-05T08:00:00.000Z",
      "updatedAt": "2026-06-05T08:00:00.000Z"
    }
  ]
}
```

---

### 2. List Orders (Branch-Scoped, Paginated)
Lists all orders belonging to the authenticated user's branch.

*   **URL:** `/api/v1/orders`
*   **Method:** `GET`
*   **Auth Required:** Yes (JWT)

#### Query Parameters
| Parameter | Type | Required | Default | Description |
| :--- | :--- | :--- | :--- | :--- |
| `page` | `number` | No | `1` | Page number to retrieve (Minimum: `1`) |
| `limit` | `number` | No | `10` | Number of records per page (Maximum: `100`) |

#### Response (200 OK)
```json
{
  "message": "Orders fetched successfully",
  "data": [
    {
      "id": "7b0b2321-df62-4b2a-8ff4-934c2b9a32c2",
      "billNo": "INV-1001",
      "totalAmount": 15.50,
      "subTotal": 15.50,
      "discountAmount": 0,
      "taxAmount": 0,
      "paymentMethod": "CASH",
      "status": "PENDING",
      "paymentStatus": "PENDING",
      "notes": "No onions",
      "branchId": "e3f08ca7-bfd2-43bb-a4ab-734f19b21f31",
      "branch": {
        "id": "e3f08ca7-bfd2-43bb-a4ab-734f19b21f31",
        "name": "Downtown Branch"
      },
      "userId": "e4b3c9f2-21a4-4df8-92a1-faee98c25cf6",
      "user": {
        "id": "e4b3c9f2-21a4-4df8-92a1-faee98c25cf6",
        "name": "Alex Cashier",
        "email": "cashier1@example.com"
      },
      "items": [
        {
          "id": "item-uuid-1",
          "quantity": 2,
          "price": 5.00,
          "total": 10.00,
          "productId": "prod-uuid-1",
          "product": {
            "id": "prod-uuid-1",
            "name": "French Fries",
            "price": 5.00
          }
        }
      ],
      "createdAt": "2026-06-05T08:00:00.000Z",
      "updatedAt": "2026-06-05T08:00:00.000Z"
    }
  ],
  "meta": {
    "total": 1,
    "page": 1,
    "limit": 10,
    "totalPages": 1
  }
}
```

---

### 3. Get Order by ID
Retrieves details of a single order under the user's branch, including all order items and associated KOT entries.

*   **URL:** `/api/v1/orders/:id`
*   **Method:** `GET`
*   **Auth Required:** Yes (JWT)

#### Path Parameters
*   `id` (UUID format, required) - The unique ID of the order.

#### Response (200 OK)
```json
{
  "message": "Orders fetched successfully",
  "data": {
    "id": "7b0b2321-df62-4b2a-8ff4-934c2b9a32c2",
    "billNo": "INV-1001",
    "totalAmount": 15.50,
    "subTotal": 15.50,
    "discountAmount": 0,
    "taxAmount": 0,
    "paymentMethod": "CASH",
    "status": "PENDING",
    "paymentStatus": "PENDING",
    "notes": "No onions",
    "branchId": "e3f08ca7-bfd2-43bb-a4ab-734f19b21f31",
    "branch": {
      "id": "e3f08ca7-bfd2-43bb-a4ab-734f19b21f31",
      "name": "Downtown Branch"
    },
    "userId": "e4b3c9f2-21a4-4df8-92a1-faee98c25cf6",
    "user": {
      "id": "e4b3c9f2-21a4-4df8-92a1-faee98c25cf6",
      "name": "Alex Cashier",
      "email": "cashier1@example.com"
    },
    "items": [
      {
        "id": "item-uuid-1",
        "quantity": 2,
        "price": 5.00,
        "total": 10.00,
        "productId": "prod-uuid-1",
        "product": {
          "id": "prod-uuid-1",
          "name": "French Fries",
          "price": 5.00
        }
      }
    ],
    "kots": [
      {
        "id": "kot-uuid-1",
        "kotNo": "KOT-1718210340",
        "status": "PENDING",
        "items": [
          {
            "id": "kot-item-uuid-1",
            "quantity": 2,
            "product": {
              "id": "prod-uuid-1",
              "name": "French Fries"
            }
          }
        ]
      }
    ],
    "createdAt": "2026-06-05T08:00:00.000Z",
    "updatedAt": "2026-06-05T08:00:00.000Z"
  }
}
```

---

### 4. Create Order
Creates a new order with items, computes billing details (using database product prices for security), saves items, and automatically creates the initial KOT ticket.

*   **URL:** `/api/v1/orders`
*   **Method:** `POST`
*   **Auth Required:** Yes (JWT)

#### Request Body
| Field | Type | Required | Description |
| :--- | :--- | :--- | :--- |
| `branchId` | `string` | Yes | Branch UUID where the order is placed. |
| `userId` | `string` | Yes | User UUID of the operator placing the order. |
| `totalAmount` | `number` | Yes | Grand total calculated client-side. |
| `discountAmount` | `number` | No | Discount discount value. |
| `taxAmount` | `number` | No | Applied tax amount. |
| `notes` | `string` | No | Customer or prep notes. |
| `paymentMethod` | `string` | No | Payment type (`CASH`, `CARD`, `UPI`). |
| `items` | `object[]` | Yes | Array of items to buy. Must contain at least 1 item. |
| `items[].productId` | `string` | Yes | Product UUID. |
| `items[].quantity` | `number` | Yes | Quantity to buy. |
| `items[].price` | `number` | Yes | Declared product price. |

##### Example Payload
```json
{
  "branchId": "e3f08ca7-bfd2-43bb-a4ab-734f19b21f31",
  "userId": "e4b3c9f2-21a4-4df8-92a1-faee98c25cf6",
  "totalAmount": 10.00,
  "discountAmount": 0,
  "taxAmount": 0,
  "notes": "No spicy",
  "items": [
    {
      "productId": "prod-uuid-1",
      "quantity": 2,
      "price": 5.00
    }
  ]
}
```

#### Response (201 Created)
Returns the created order details and the automatically generated initial KOT ticket.

##### Example Response Body
```json
{
  "message": "Order created successfully",
  "data": {
    "order": {
      "id": "7b0b2321-df62-4b2a-8ff4-934c2b9a32c2",
      "billNo": "INV-1002",
      "totalAmount": 10.00,
      "subTotal": 10.00,
      "discountAmount": 0,
      "taxAmount": 0,
      "paymentMethod": null,
      "status": "PENDING",
      "paymentStatus": "PENDING",
      "notes": "No spicy",
      "branchId": "e3f08ca7-bfd2-43bb-a4ab-734f19b21f31",
      "userId": "e4b3c9f2-21a4-4df8-92a1-faee98c25cf6",
      "createdAt": "2026-06-05T09:30:00.000Z",
      "updatedAt": "2026-06-05T09:30:00.000Z",
      "items": [
        {
          "id": "item-uuid-2",
          "quantity": 2,
          "price": 5.00,
          "total": 10.00,
          "productId": "prod-uuid-1",
          "product": {
            "id": "prod-uuid-1",
            "name": "French Fries",
            "price": 5.00
          }
        }
      ]
    },
    "kot": {
      "id": "kot-uuid-2",
      "kotNo": "KOT-1718210355",
      "status": "PENDING",
      "items": [
        {
          "id": "kot-item-uuid-2",
          "quantity": 2,
          "product": {
            "id": "prod-uuid-1",
            "name": "French Fries"
          }
        }
      ]
    }
  }
}
```

---

### 5. Update Order (Append Items / Add Payment)
Appends newly selected items to an order and applies a payment method. This generates a **new KOT ticket** containing *only the newly added items* to prevent duplicating kitchen instructions.

*   **URL:** `/api/v1/orders/:id`
*   **Method:** `PATCH`
*   **Auth Required:** Yes (JWT)

#### Path Parameters
*   `id` (UUID format, required) - The unique ID of the order to update.

#### Request Body
All fields below are required.
| Field | Type | Required | Description |
| :--- | :--- | :--- | :--- |
| `branchId` | `string` | Yes | Branch UUID where the order is placed. |
| `userId` | `string` | Yes | User UUID of the operator placing the order. |
| `totalAmount` | `number` | Yes | Updated grand total value. |
| `discountAmount` | `number` | No | Updated discount value. |
| `taxAmount` | `number` | No | Updated tax amount. |
| `paymentMethod` | `string` | Yes | Chosen payment type (`CASH`, `CARD`, `UPI`). |
| `items` | `object[]` | Yes | List of **newly added items** to append to the order. |

##### Example Payload
```json
{
  "branchId": "e3f08ca7-bfd2-43bb-a4ab-734f19b21f31",
  "userId": "e4b3c9f2-21a4-4df8-92a1-faee98c25cf6",
  "totalAmount": 15.00,
  "discountAmount": 0,
  "taxAmount": 0,
  "paymentMethod": "CASH",
  "items": [
    {
      "productId": "prod-uuid-2",
      "quantity": 1,
      "price": 5.00
    }
  ]
}
```

#### Response (200 OK)
Returns the updated order with all appended items.

##### Example Response Body
```json
{
  "message": "Order updated successfully",
  "data": {
    "id": "7b0b2321-df62-4b2a-8ff4-934c2b9a32c2",
    "billNo": "INV-1002",
    "totalAmount": 15.00,
    "subTotal": 15.00,
    "discountAmount": 0,
    "taxAmount": 0,
    "paymentMethod": "CASH",
    "status": "PENDING",
    "paymentStatus": "PENDING",
    "notes": "No spicy",
    "branchId": "e3f08ca7-bfd2-43bb-a4ab-734f19b21f31",
    "userId": "e4b3c9f2-21a4-4df8-92a1-faee98c25cf6",
    "createdAt": "2026-06-05T09:30:00.000Z",
    "updatedAt": "2026-06-05T09:40:00.000Z",
    "items": [
      {
        "id": "item-uuid-2",
        "quantity": 2,
        "price": 5.00,
        "total": 10.00,
        "productId": "prod-uuid-1",
        "product": {
          "id": "prod-uuid-1",
          "name": "French Fries",
          "price": 5.00
        }
      },
      {
        "id": "item-uuid-3",
        "quantity": 1,
        "price": 5.00,
        "total": 5.00,
        "productId": "prod-uuid-2",
        "product": {
          "id": "prod-uuid-2",
          "name": "Onion Rings",
          "price": 5.00
        }
      }
    ]
  }
}
```

---

### 6. Delete Order
Removes an order and its associated database relations.

*   **URL:** `/api/v1/orders/:id`
*   **Method:** `DELETE`
*   **Auth Required:** Yes (JWT)

#### Path Parameters
*   `id` (UUID format, required) - The unique ID of the order.

#### Response (200 OK)
```json
{
  "message": "Order deleted successfully"
}
```

---

## 🍳 Kitchen Order Tickets (KOT) API

Endpoints under `/kots` manage the lifecycle of Kitchen Order Tickets (KOT) for kitchen staff tracking.

---

### 1. KOT Public Lookup
Lists all KOT tickets sorted by creation time. No authentication required.

*   **URL:** `/api/v1/kots/lookup`
*   **Method:** `GET`
*   **Auth Required:** No

#### Response (200 OK)
```json
{
  "message": "Public KOTs fetched successfully",
  "data": [
    {
      "id": "kot-uuid-1",
      "kotNo": "KOT-1718210340",
      "status": "PENDING",
      "orderId": "7b0b2321-df62-4b2a-8ff4-934c2b9a32c2",
      "createdAt": "2026-06-05T08:00:00.000Z",
      "items": [
        {
          "id": "kot-item-uuid-1",
          "quantity": 2,
          "note": null,
          "productId": "prod-uuid-1",
          "product": {
            "id": "prod-uuid-1",
            "name": "French Fries",
            "price": 5.00
          }
        }
      ]
    }
  ]
}
```

---

### 2. List KOTs (Branch-Scoped, Paginated)
Lists all KOTs belonging to the authenticated user's branch.

*   **URL:** `/api/v1/kots`
*   **Method:** `GET`
*   **Auth Required:** Yes (JWT)

#### Query Parameters
| Parameter | Type | Required | Default | Description |
| :--- | :--- | :--- | :--- | :--- |
| `page` | `number` | No | `1` | Page number to retrieve (Minimum: `1`) |
| `limit` | `number` | No | `10` | Number of records per page (Maximum: `100`) |

#### Response (200 OK)
Same response format as `GET /kots/lookup` wrapped in paginated format with a `meta` field:
```json
{
  "message": "kots fetched successfully",
  "data": [ ... ],
  "meta": {
    "total": 1,
    "page": 1,
    "limit": 10,
    "totalPages": 1
  }
}
```

---

### 3. Find KOT by ID
Retrieves details of a single KOT under the user's branch.

*   **URL:** `/api/v1/kots/:id`
*   **Method:** `GET`
*   **Auth Required:** Yes (JWT)

#### Path Parameters
*   `id` (UUID format, required) - The unique ID of the KOT.

#### Response (200 OK)
```json
{
  "message": "kot fetched successfully",
  "data": {
    "id": "kot-uuid-1",
    "kotNo": "KOT-1718210340",
    "status": "PENDING",
    "orderId": "7b0b2321-df62-4b2a-8ff4-934c2b9a32c2",
    "createdAt": "2026-06-05T08:00:00.000Z",
    "items": [
      {
        "id": "kot-item-uuid-1",
        "quantity": 2,
        "note": null,
        "productId": "prod-uuid-1",
        "product": {
          "id": "prod-uuid-1",
          "name": "French Fries",
          "price": 5.00
        }
      }
    ]
  }
}
```

---

### 4. Manually Create KOT
Manually creates a new KOT ticket linked to an existing order.

*   **URL:** `/api/v1/kots`
*   **Method:** `POST`
*   **Auth Required:** Yes (JWT)

#### Request Body
| Field | Type | Required | Description |
| :--- | :--- | :--- | :--- |
| `orderId` | `string` | Yes | Parent Order UUID. |
| `items` | `object[]` | Yes | List of items for this KOT. |
| `items[].productId` | `string` | Yes | Product UUID. |
| `items[].quantity` | `number` | Yes | Quantity. |
| `items[].price` | `number` | Yes | Price (Note: declared price is validated but not stored in KOT items). |

##### Example Payload
```json
{
  "orderId": "7b0b2321-df62-4b2a-8ff4-934c2b9a32c2",
  "items": [
    {
      "productId": "prod-uuid-1",
      "quantity": 1,
      "price": 5.00
    }
  ]
}
```

#### Response (201 Created)
Returns the created KOT ticket details.

---

### 5. Update KOT Status
Updates the status of a kitchen ticket. This recalculates and propagates the overall parent Order status automatically.

*   **URL:** `/api/v1/kots/:id`
*   **Method:** `PATCH`
*   **Auth Required:** Yes (JWT)

#### Path Parameters
*   `id` (UUID format, required) - The unique ID of the KOT.

#### Request Body
| Field | Type | Required | Description |
| :--- | :--- | :--- | :--- |
| `status` | `string` | Yes | Target KOT status. Must be one of: `PENDING`, `PREPARING`, `READY`, `SERVED`. |

> [!NOTE]
> Although the request payload DTO accepts an `items` array, the KOT service logic exclusively updates the ticket `status` field. Items within the KOT cannot be edited once created.

##### Example Payload
```json
{
  "status": "PREPARING"
}
```

#### Response (200 OK)
Returns the updated KOT ticket and triggers a calculation of the parent Order status:
- If **any** KOT status is `PENDING`, Order status sets to `PENDING`.
- Else if **any** KOT status is `PREPARING`, Order status sets to `PREPARING`.
- Else if **any** KOT status is `READY`, Order status sets to `READY`.
- Else if **all** KOT statuses are `SERVED`, Order status sets to `COMPLETED`.

---

### 6. Delete KOT
Deletes a KOT ticket by ID.

*   **URL:** `/api/v1/kots/:id`
*   **Method:** `DELETE`
*   **Auth Required:** Yes (JWT)

#### Path Parameters
*   `id` (UUID format, required) - The unique ID of the KOT.

#### Response (200 OK)
```json
{
  "message": "kot deleted successfully"
}
```

---

## 📊 Dashboard Metrics API

Endpoints under `/dashboard` provide high-level statistics and summaries tailored dynamically to the user's role and branch scope.

---

### 1. Retrieve Dashboard Stats
Fetches statistics based on the authenticated user's profile and scope.

*   **URL:** `/api/v1/dashboard`
*   **Method:** `GET`
*   **Auth Required:** Yes (JWT)

---

#### Case A: Central / Head-Office Scope (User has no `branchId` assigned)
Returns corporate-wide stats.

##### Example Response (200 OK)
```json
{
  "message": "Welcome ADMIN",
  "data": {
    "dashboardType": "CENTRAL",
    "role": "ADMIN",
    "totalBranches": 12
  }
}
```

---

#### Case B: Branch-Specific Scope (User has a `branchId` assigned)
Returns branch-specific order summaries and pending work statistics.

##### Example Response (200 OK)
```json
{
  "message": "Welcome CASHIER",
  "data": {
    "dashboardType": "BRANCH",
    "role": "CASHIER",
    "totalOrders": 47,
    "pendingKots": 3
  }
}
```
  
#### Response Properties Description
| Field | Type | Description |
| :--- | :--- | :--- |
| `dashboardType` | `string` | Scope of the dashboard: `CENTRAL` or `BRANCH`. |
| `role` | `string` | The role name of the logged-in user. |
| `totalBranches` | `number` | Total branches in the system (Central view only). |
| `totalOrders` | `number` | Total orders placed at the user's branch (Branch view only). |
| `pendingKots` | `number` | Count of KOT tickets currently in `PENDING` status at the user's branch (Branch view only). |

---

## 📈 Reports & Analytics API

Endpoints under `/reports` fetch product-wise sales analytics for branches over different time ranges. Restricted to authenticated users.

---

### 1. Get Product Sales Report
Retrieves product sales aggregated for a specified branch and period (daily, weekly, monthly, or yearly).

*   **URL:** `/api/v1/reports/products/:branch_id`
*   **Method:** `GET`
*   **Auth Required:** Yes (JWT)

#### Path Parameters
*   `branch_id` (UUID format, required) - The branch ID to query.

#### Query Parameters
| Parameter | Type | Required | Default | Description |
| :--- | :--- | :--- | :--- | :--- |
| `period` | `string` | No | `daily` | The reporting period. Allowed values: `daily`, `weekly`, `monthly`, `yearly` |

#### Response (200 OK)
Returns a confirmation message and aggregated sales data for products in the branch for the selected period.

##### Example Response (period = daily)
```json
{
  "success": true,
  "message": "Daily product sales report fetched successfully",
  "data": [
    {
      "productId": "prod-uuid-1",
      "productName": "Cheese Burger",
      "price": 8.99,
      "image": "https://res.cloudinary.com/.../burger.jpg",
      "category": "Fast Food",
      "quantitySold": 15,
      "totalSales": 134.85
    },
    {
      "productId": "prod-uuid-2",
      "productName": "French Fries",
      "price": 5.00,
      "image": null,
      "category": "Sides",
      "quantitySold": 10,
      "totalSales": 50.00
    }
  ]
}
```

##### Example Response (period = weekly)
```json
{
  "success": true,
  "message": "Weekly product sales report fetched successfully",
  "data": [
    {
      "productId": "prod-uuid-1",
      "productName": "Cheese Burger",
      "price": 8.99,
      "image": "https://res.cloudinary.com/.../burger.jpg",
      "category": "Fast Food",
      "quantitySold": 82,
      "totalSales": 737.18
    }
  ]
}
```

##### Example Response (period = monthly)
```json
{
  "success": true,
  "message": "Monthly product sales report fetched successfully",
  "data": [
    {
      "productId": "prod-uuid-1",
      "productName": "Cheese Burger",
      "price": 8.99,
      "image": "https://res.cloudinary.com/.../burger.jpg",
      "category": "Fast Food",
      "quantitySold": 345,
      "totalSales": 3101.55
    }
  ]
}
```

##### Example Response (period = yearly)
```json
{
  "success": true,
  "message": "Yearly product sales report fetched successfully",
  "data": [
    {
      "productId": "prod-uuid-1",
      "productName": "Cheese Burger",
      "price": 8.99,
      "image": "https://res.cloudinary.com/.../burger.jpg",
      "category": "Fast Food",
      "quantitySold": 1250,
      "totalSales": 11237.50
    }
  ]
}
```

#### Response Fields Description
| Field | Type | Description |
| :--- | :--- | :--- |
| `productId` | `string` | The unique ID of the product. |
| `productName` | `string` | The display name of the product. |
| `price` | `number` | The current unit price of the product. |
| `image` | `string \ null` | Cloudinary URL of the product image if uploaded. |
| `category` | `string` | The name of the category the product belongs to. |
| `quantitySold` | `number` | Total quantity sold during the specified date range. |
| `totalSales` | `number` | Cumulative revenue generated from sales of this product. |

> [!NOTE]
> Reports only count order items belonging to orders with status `COMPLETED`. Draft, pending, or preparing orders are excluded from revenue stats.

---

## 🔑 Permissions API

Endpoints under `/permissions` fetch metadata on system permissions, categorized under their parent modules. Useful for configuring custom role access maps in settings.

---

### 1. Get Grouped Permissions List
Retrieves all permissions in the system, organized hierarchically by modules.

*   **URL:** `/api/v1/permissions`
*   **Method:** `GET`
*   **Auth Required:** Yes (JWT)

#### Response (200 OK)
Returns a grouped list of modules containing permissions and potential child modules.

##### Example Response Body
```json
{
  "message": "permissions fetched successfully",
  "data": [
    {
      "id": "mod-uuid-1",
      "name": "Order Management",
      "key": "orders",
      "order": 1,
      "icon": "shopping-cart",
      "url": "/orders",
      "parentId": null,
      "permissions": [
        {
          "id": "perm-uuid-1",
          "key": "order:create",
          "description": "Allows creating restaurant orders"
        },
        {
          "id": "perm-uuid-2",
          "key": "order:view",
          "description": "Allows viewing orders"
        }
      ],
      "children": []
    },
    {
      "id": "mod-uuid-2",
      "name": "System Configuration",
      "key": "settings",
      "order": 2,
      "icon": "settings",
      "url": "/settings",
      "parentId": null,
      "permissions": [],
      "children": [
        {
          "id": "mod-uuid-3",
          "name": "Roles & RBAC",
          "key": "rbac",
          "order": 1,
          "icon": "users",
          "url": "/settings/rbac",
          "parentId": "mod-uuid-2",
          "permissions": [
            {
              "id": "perm-uuid-3",
              "key": "role:manage",
              "description": "Allows creating and deleting roles"
            }
          ],
          "children": []
        }
      ]
    }
  ]
}
```
  
#### Response Properties Description
| Field | Type | Description |
| :--- | :--- | :--- |
| `id` | `string` | The UUID of the module or permission. |
| `name` | `string` | The display name of the module. |
| `key` | `string` | System routing/checking keys for UI or API checks. |
| `order` | `number` | Order sorting number for UI sidebar/menus. |
| `icon` | `string \ undefined` | Icon library identifier. |
| `url` | `string \ undefined` | Client-side routing path. |
| `parentId` | `string \ null` | Parent module UUID for submenus. |
| `permissions` | `object[]` | List of permissions tied to this specific module. |
| `children` | `object[]` | Sub-modules nested under this parent. |

---

## ⚙️ System API

Utility endpoints handling health checks, system status, and session token validation.

---

### 1. API Greeting
Basic endpoint serving as a hello-world checks to confirm the API is listening.

*   **URL:** `/api/v1/`
*   **Method:** `GET`
*   **Auth Required:** No

#### Response (200 OK)
```
Welcome to the POS API
```

---

### 2. API Health Status
Returns health statistics, uptime details, and system local timestamps. Use for monitoring services.

*   **URL:** `/api/v1/health`
*   **Method:** `GET`
*   **Auth Required:** No

#### Response (200 OK)
```json
{
  "status": "ok",
  "timestamp": "2026-06-05T08:00:00.000Z",
  "uptime": 1243.56
}
```

---

### 3. Session Validation
Verifies if the client's Bearer JWT is authentic and valid.

*   **URL:** `/api/v1/session`
*   **Method:** `GET`
*   **Auth Required:** Yes (JWT)

#### Response (200 OK)
```json
{
  "ok": true,
  "authenticated": true,
  "userId": "c1a2e9b0-9f05-4c07-ba79-11c76cd0a38b"
}
```

#### Errors
| Status Code | Message | Description |
| :--- | :--- | :--- |
| `401 Unauthorized` | `Unauthorized` | Bearer token is missing, expired, or failed signature checks. |
