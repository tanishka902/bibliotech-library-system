
package com.example.book_service.service;

import java.util.List;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.example.book_service.entity.Book;
import com.example.book_service.repository.BookRepository;

@Service
public class BookService {

    private final BookRepository bookRepository;

    public BookService(BookRepository bookRepository) {
        this.bookRepository = bookRepository;
    }

    public Book createBook(Book book) {
        validateBook(book);

        if (bookRepository.existsByIsbn(book.getIsbn())) {
            throw new IllegalArgumentException("ISBN already exists");
        }

        book.setAvailableCopies(book.getTotalCopies());
        return bookRepository.save(book);
    }

    public List<Book> getAllBooks() {
        return bookRepository.findAll();
    }

    public Book getBookById(Long id) {
        return bookRepository.findById(id)
                .orElseThrow(() ->
                    new RuntimeException("Book not found with ID: " + id));
    }



public Book updateBook(Long id, Book updatedBook) {
    validateBook(updatedBook);

    Book existingBook = getBookById(id);

    if (!existingBook.getIsbn().equals(updatedBook.getIsbn())
            && bookRepository.existsByIsbn(updatedBook.getIsbn())) {
        throw new IllegalArgumentException("ISBN already exists");
    }

    int borrowedCopies =
            existingBook.getTotalCopies() - existingBook.getAvailableCopies();

    if (updatedBook.getTotalCopies() < borrowedCopies) {
        throw new IllegalArgumentException(
                "Total copies cannot be less than borrowed copies");
    }

    existingBook.setTitle(updatedBook.getTitle());
    existingBook.setAuthor(updatedBook.getAuthor());
    existingBook.setIsbn(updatedBook.getIsbn());

    existingBook.setTotalCopies(updatedBook.getTotalCopies());

    // Preserve the existing number of borrowed copies.
    existingBook.setAvailableCopies(
            updatedBook.getTotalCopies() - borrowedCopies);

    if (updatedBook.getDemandLevel() != null) {
        existingBook.setDemandLevel(updatedBook.getDemandLevel());
    }

    return bookRepository.save(existingBook);
}



    @Transactional
    public void deleteBook(Long id) {
        Book book = getBookById(id);

        if (book.getAvailableCopies() != book.getTotalCopies()) {
            throw new IllegalArgumentException(
                    "Cannot delete a book while copies are borrowed");
        }

        bookRepository.delete(book);
    }

    private void validateBook(Book book) {
        if (book.getTitle() == null || book.getTitle().isBlank()) {
            throw new IllegalArgumentException("Title is required");
        }

        if (book.getAuthor() == null || book.getAuthor().isBlank()) {
            throw new IllegalArgumentException("Author is required");
        }

        if (book.getIsbn() == null || book.getIsbn().isBlank()) {
            throw new IllegalArgumentException("ISBN is required");
        }

        if (book.getTotalCopies() < 1) {
            throw new IllegalArgumentException(
                    "Total copies must be at least 1");
        }
    }
    

public Book borrowCopy(Long id) {
    Book book = getBookById(id);

    if (book.getAvailableCopies() < 1) {
        throw new IllegalArgumentException("No copies available");
    }

    book.setAvailableCopies(book.getAvailableCopies() - 1);
    return bookRepository.save(book);
}

public Book returnCopy(Long id) {
    Book book = getBookById(id);

    if (book.getAvailableCopies() >= book.getTotalCopies()) {
        throw new IllegalArgumentException("All copies are already available");
    }

    book.setAvailableCopies(book.getAvailableCopies() + 1);
    return bookRepository.save(book);
}

}
