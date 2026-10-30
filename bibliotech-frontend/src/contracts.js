
const asId = (v) =>
  typeof v === 'string' && /^\d+$/.test(v) ? Number(v) : v;

export const contracts = {
  signin: ({ identifier, password }) => ({
    username: identifier,
    email: identifier,
    password,
  }),

  signup: ({ username, email, password, role }) => {
    const body = { username, email, password };
    if (role) body.role = role;
    return body;
  },

  book: (form, existing) => {
    const raw = existing?.raw ?? {};
    const availKey = existing?.availableKey || 'availableCopies';
    const demandKey = existing?.demandKey || 'demandLevel';

    const body = {
      ...raw,
      title: form.title.trim(),
      author: form.author.trim(),
      isbn: form.isbn.trim(),
      [availKey]: form.availableCopies,
      [demandKey]: form.demandLevel,
    };

    if (!existing) {
      body.totalCopies = form.availableCopies;
    } else if ('totalCopies' in raw) {
      body.totalCopies = Math.max(
        Number(raw.totalCopies) || 0,
        form.availableCopies
      );
    }

    return body;
  },

  borrow: ({ user, book }) => {
    const userEmail =
      user?.email ||
      user?.username;

    if (!userEmail) {
      throw new Error('User email is missing. Please sign in again.');
    }

    const dueDate = new Date();
    dueDate.setDate(dueDate.getDate() + 14);

    return {
      bookId: asId(book.id),
      userEmail,
      dueDate: dueDate.toISOString().split('T')[0],
    };
  },

  calculateFine: ({ rental, demand, daysLate }) => ({
    rentalId: asId(rental.id),
    userId: asId(rental.userId),
    bookId: asId(rental.bookId),
    daysLate,
    overdueDays: daysLate,
    demandLevel: demand || undefined,
  }),
};
