// One function per backend endpoint you listed. Nothing else is called.
//
//   Auth     POST /signup, POST /signin
//   Books    GET /books, GET /books/{id}, POST /books, PUT /books/{id}, DELETE /books/{id}
//   Rentals  POST /rentals/borrow, GET /rentals, GET /rentals/{id}, PUT /rentals/{id}/return
//   Fines    POST /fines/calculate, GET /fines, GET /fines/{id}, PUT /fines/{id}/pay
//
// NOT called from the UI: POST /books/{id}/borrow and POST /books/{id}/return. Those adjust
// stock directly; the user-facing flow goes through the Rental Service, which is expected to
// update the book. Calling both could change the copy count twice.
import { request } from './client';
import { getRoute } from '../config';
import { normalizeBook, normalizeFine, normalizeRental, toList } from './normalize';

export const authApi = {
  signin: (body) => request(`${getRoute('auth')}/signin`, { method: 'POST', body, auth: false }),
  signup: (body) => request(`${getRoute('auth')}/signup`, { method: 'POST', body, auth: false }),
};

export const booksApi = {
  list: async () => toList(await request(getRoute('books'))).map(normalizeBook),
  get: async (id) => normalizeBook(await request(`${getRoute('books')}/${id}`)),
  create: (body) => request(getRoute('books'), { method: 'POST', body }),
  update: (id, body) => request(`${getRoute('books')}/${id}`, { method: 'PUT', body }),
  remove: (id) => request(`${getRoute('books')}/${id}`, { method: 'DELETE' }),
};

export const rentalsApi = {
  list: async () => toList(await request(getRoute('rentals'))).map(normalizeRental),
  get: async (id) => normalizeRental(await request(`${getRoute('rentals')}/${id}`)),
  borrow: (body) => request(`${getRoute('rentals')}/borrow`, { method: 'POST', body }),
  returnBook: (id) => request(`${getRoute('rentals')}/${id}/return`, { method: 'PUT' }),
};

export const finesApi = {
  list: async () => toList(await request(getRoute('fines'))).map(normalizeFine),
  get: async (id) => normalizeFine(await request(`${getRoute('fines')}/${id}`)),
  calculate: (body) => request(`${getRoute('fines')}/calculate`, { method: 'POST', body }),
  pay: (id) => request(`${getRoute('fines')}/${id}/pay`, { method: 'PUT' }),
};
