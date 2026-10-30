
package com.example.book_service.repository;

import org.springframework.data.jpa.repository.JpaRepository;
import com.example.book_service.entity.Book;

public interface BookRepository extends JpaRepository<Book, Long> {
    boolean existsByIsbn(String isbn);
}
