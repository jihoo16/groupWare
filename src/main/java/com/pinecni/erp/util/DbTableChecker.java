package com.pinecni.erp.util;

import java.sql.*;
import java.util.ArrayList;
import java.util.List;

/**
 * DB 테이블 존재 여부 확인 유틸리티
 */
public class DbTableChecker {

    public static void main(String[] args) {
        String url = "jdbc:postgresql://192.168.1.165:15431/pinecni";
        String user = "erp_dev";
        String password = "rdsdap1234!%";

        try (Connection conn = DriverManager.getConnection(url, user, password);
             Statement stmt = conn.createStatement()) {

            System.out.println("=== DB 연결 성공 ===");
            System.out.println();

            // 1. erp 스키마의 모든 테이블 조회
            String query1 = "SELECT tablename FROM pg_tables " +
                           "WHERE schemaname = 'erp' " +
                           "ORDER BY tablename";

            System.out.println("=== erp 스키마의 모든 테이블 ===");
            List<String> allTables = new ArrayList<>();
            ResultSet rs1 = stmt.executeQuery(query1);
            while (rs1.next()) {
                String tableName = rs1.getString("tablename");
                allTables.add(tableName);
                System.out.println("  - " + tableName);
            }
            System.out.println("총 " + allTables.size() + "개 테이블");
            rs1.close();

            System.out.println();

            // 2. 각 테이블의 컬럼 정보 상세 확인
            System.out.println("=== 테이블별 컬럼 정보 (Entity 매칭용) ===");

            for (String tableName : allTables) {
                System.out.println("\n[" + tableName + "]");
                String query2 = "SELECT column_name, data_type, " +
                               "character_maximum_length, is_nullable, column_default " +
                               "FROM information_schema.columns " +
                               "WHERE table_schema = 'erp' AND table_name = ? " +
                               "ORDER BY ordinal_position";

                PreparedStatement pstmt = conn.prepareStatement(query2);
                pstmt.setString(1, tableName);
                ResultSet rs2 = pstmt.executeQuery();

                while (rs2.next()) {
                    String colName = rs2.getString("column_name");
                    String dataType = rs2.getString("data_type");
                    String maxLen = rs2.getString("character_maximum_length");
                    String nullable = rs2.getString("is_nullable");
                    String defaultVal = rs2.getString("column_default");

                    System.out.print("  " + colName + " | " + dataType);
                    if (maxLen != null) System.out.print("(" + maxLen + ")");
                    System.out.print(" | " + (nullable.equals("YES") ? "NULL" : "NOT NULL"));
                    if (defaultVal != null && !defaultVal.isEmpty()) {
                        System.out.print(" | DEFAULT: " + defaultVal);
                    }
                    System.out.println();
                }
                rs2.close();
                pstmt.close();
            }

        } catch (Exception e) {
            System.err.println("DB 연결 실패: " + e.getMessage());
            e.printStackTrace();
        }
    }
}
