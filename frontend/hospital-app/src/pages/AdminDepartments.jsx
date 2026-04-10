import React, { useEffect, useState } from "react";
import {
  Alert,
  AlertIcon,
  Badge,
  Box,
  Button,
  FormControl,
  FormLabel,
  Grid,
  Heading,
  HStack,
  Input,
  Stack,
  Switch,
  Text,
} from "@chakra-ui/react";
import {
  deleteManagedDepartment,
  fetchManagedDepartments,
  reorderManagedDepartments,
  saveManagedDepartment,
  updateDepartmentStatus,
} from "../api/adminApi";
import { useAuth } from "../auth/AuthContext";
import { LoadingCard } from "../components/LoadingState";
import PageShell from "../components/PageShell";

function DepartmentManagementLoadingLayout() {
  return (
    <Grid templateColumns={{ base: "1fr", xl: "1.4fr 0.9fr" }} gap={6}>
      <LoadingCard minH="520px" titleWidth="28%" lines={8} />
      <LoadingCard minH="320px" titleWidth="34%" lines={5} />
    </Grid>
  );
}

function buildNameDrafts(items, current = {}) {
  const next = {};
  items.forEach((item) => {
    next[item.id] = current[item.id] ?? item.name;
  });
  return next;
}

function moveItem(items, fromIndex, toIndex) {
  const next = [...items];
  const [moved] = next.splice(fromIndex, 1);
  next.splice(toIndex, 0, moved);
  return next.map((item, index) => ({
    ...item,
    sort_order: index + 1,
  }));
}

export default function AdminDepartments() {
  const { token } = useAuth();
  const [departments, setDepartments] = useState([]);
  const [nameDrafts, setNameDrafts] = useState({});
  const [pageLoading, setPageLoading] = useState(true);
  const [savingDepartmentId, setSavingDepartmentId] = useState("");
  const [savingAction, setSavingAction] = useState("");
  const [addDepartmentSaving, setAddDepartmentSaving] = useState(false);
  const [draggingDepartmentId, setDraggingDepartmentId] = useState("");
  const [dragOverDepartmentId, setDragOverDepartmentId] = useState("");
  const [newDepartment, setNewDepartment] = useState({
    name: "",
    isActive: true,
  });
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  const applyDepartments = (items, preserveDrafts = false) => {
    const sorted = [...items].sort(
      (left, right) => Number(left.sort_order || 0) - Number(right.sort_order || 0)
    );
    setDepartments(sorted);
    setNameDrafts((current) => buildNameDrafts(sorted, preserveDrafts ? current : {}));
  };

  const loadDepartments = async () => {
    setPageLoading(true);
    setError("");

    try {
      const result = await fetchManagedDepartments(token);
      applyDepartments(result.items);
    } catch (nextError) {
      setError(nextError.message || "診療科一覧の取得に失敗しました。");
    } finally {
      setPageLoading(false);
    }
  };

  useEffect(() => {
    loadDepartments();
  }, [token]);

  const handleChangeNameDraft = (departmentId, value) => {
    setNameDrafts((current) => ({
      ...current,
      [departmentId]: value,
    }));
  };

  const handleResetDepartmentName = (department) => {
    setNameDrafts((current) => ({
      ...current,
      [department.id]: department.name,
    }));
  };

  const handleSaveDepartmentName = async (department, index) => {
    const nextName = (nameDrafts[department.id] ?? department.name).trim();
    if (!nextName) {
      setError("診療科名を入力してください。");
      return;
    }

    setSavingDepartmentId(department.id);
    setSavingAction("save");
    setError("");
    setMessage("");

    try {
      const saved = await saveManagedDepartment({
        departmentId: department.id,
        name: nextName,
        sortOrder: index + 1,
        isActive: department.is_active,
        token,
      });
      const nextDepartments = departments.map((item) =>
        item.id === department.id ? { ...item, ...saved, sort_order: index + 1 } : item
      );
      applyDepartments(nextDepartments, true);
      setNameDrafts((current) => ({
        ...current,
        [department.id]: saved.name,
      }));
      setMessage(`${saved.name} を更新しました。`);
    } catch (nextError) {
      setError(nextError.message || "診療科の更新に失敗しました。");
    } finally {
      setSavingDepartmentId("");
      setSavingAction("");
    }
  };

  const handleToggleDepartment = async (department) => {
    setSavingDepartmentId(department.id);
    setSavingAction("toggle");
    setError("");
    setMessage("");

    try {
      const saved = await updateDepartmentStatus({
        departmentId: department.id,
        isActive: !department.is_active,
        token,
      });
      const nextDepartments = departments.map((item) =>
        item.id === department.id ? { ...item, ...saved } : item
      );
      applyDepartments(nextDepartments, true);
      setMessage(
        saved.is_active
          ? `${saved.name} の受付を再開しました。`
          : `${saved.name} の受付を停止しました。`
      );
    } catch (nextError) {
      setError(nextError.message || "受付状態の更新に失敗しました。");
    } finally {
      setSavingDepartmentId("");
      setSavingAction("");
    }
  };

  const persistDepartmentOrder = async (nextDepartments, successMessage) => {
    const previousDepartments = departments;
    applyDepartments(nextDepartments, true);
    setSavingAction("reorder");
    setError("");
    setMessage("");

    try {
      const result = await reorderManagedDepartments({
        orderedDepartmentIds: nextDepartments.map((department) => department.id),
        token,
      });
      applyDepartments(result.items, true);
      setMessage(successMessage);
    } catch (nextError) {
      applyDepartments(previousDepartments, true);
      setError(nextError.message || "診療科の並び替えに失敗しました。");
    } finally {
      setSavingDepartmentId("");
      setSavingAction("");
      setDraggingDepartmentId("");
      setDragOverDepartmentId("");
    }
  };

  const handleMoveDepartment = async (departmentId, direction) => {
    const currentIndex = departments.findIndex((department) => department.id === departmentId);
    if (currentIndex === -1) {
      return;
    }

    let nextIndex = currentIndex;
    if (direction === "first") {
      nextIndex = 0;
    } else if (direction === "last") {
      nextIndex = departments.length - 1;
    } else if (direction === "up") {
      nextIndex = currentIndex - 1;
    } else if (direction === "down") {
      nextIndex = currentIndex + 1;
    }

    if (nextIndex < 0 || nextIndex >= departments.length) {
      return;
    }
    if (nextIndex === currentIndex) {
      return;
    }

    setSavingDepartmentId(departmentId);
    const nextDepartments = moveItem(departments, currentIndex, nextIndex);
    await persistDepartmentOrder(nextDepartments, "診療科の表示順を更新しました。");
  };

  const handleDragStart = (departmentId) => {
    if (savingAction === "reorder") {
      return;
    }
    setDraggingDepartmentId(departmentId);
    setDragOverDepartmentId(departmentId);
  };

  const handleDropDepartment = async (targetDepartmentId) => {
    if (!draggingDepartmentId || draggingDepartmentId === targetDepartmentId) {
      setDraggingDepartmentId("");
      setDragOverDepartmentId("");
      return;
    }

    const fromIndex = departments.findIndex((department) => department.id === draggingDepartmentId);
    const toIndex = departments.findIndex((department) => department.id === targetDepartmentId);

    if (fromIndex === -1 || toIndex === -1) {
      setDraggingDepartmentId("");
      setDragOverDepartmentId("");
      return;
    }

    setSavingDepartmentId(draggingDepartmentId);
    const nextDepartments = moveItem(departments, fromIndex, toIndex);
    await persistDepartmentOrder(nextDepartments, "診療科の表示順を更新しました。");
  };

  const handleDeleteDepartment = async (department) => {
    const confirmed = window.confirm(
      `${department.name} を完全に削除します。予約が残っている場合は削除できません。`
    );
    if (!confirmed) {
      return;
    }

    setSavingDepartmentId(department.id);
    setSavingAction("delete");
    setError("");
    setMessage("");

    try {
      await deleteManagedDepartment({
        departmentId: department.id,
        token,
      });
      const nextDepartments = departments
        .filter((item) => item.id !== department.id)
        .map((item, index) => ({
          ...item,
          sort_order: index + 1,
        }));
      applyDepartments(nextDepartments, true);
      setMessage(`${department.name} を削除しました。`);
    } catch (nextError) {
      setError(nextError.message || "診療科の削除に失敗しました。");
    } finally {
      setSavingDepartmentId("");
      setSavingAction("");
    }
  };

  const handleAddDepartment = async () => {
    const trimmedName = newDepartment.name.trim();
    if (!trimmedName) {
      setError("診療科名を入力してください。");
      return;
    }

    setAddDepartmentSaving(true);
    setError("");
    setMessage("");

    try {
      const saved = await saveManagedDepartment({
        departmentId: undefined,
        name: trimmedName,
        sortOrder: departments.length + 1,
        isActive: newDepartment.isActive,
        token,
      });
      applyDepartments([...departments, saved], true);
      setNewDepartment({
        name: "",
        isActive: true,
      });
      setMessage(`${saved.name} を追加しました。`);
    } catch (nextError) {
      setError(nextError.message || "診療科の追加に失敗しました。");
    } finally {
      setAddDepartmentSaving(false);
    }
  };

  return (
    <PageShell
      title="診療科管理"
      subtitle="追加、表示順の変更、受付状態の切り替え、削除をまとめて行います。"
      heroSubtitle="総合病院の運用管理画面です。診療科管理、休診日、予約状況の確認を行います。"
      backTo="/admin"
    >
      {error && (
        <Alert status="error" mb={4} borderRadius="md">
          <AlertIcon />
          <Text>{error}</Text>
        </Alert>
      )}

      {message && (
        <Alert status="success" mb={4} borderRadius="md">
          <AlertIcon />
          <Text>{message}</Text>
        </Alert>
      )}

      {pageLoading ? (
        <DepartmentManagementLoadingLayout />
      ) : (
        <Stack spacing={6}>
          <Box bg="white" borderRadius="24px" p={{ base: 5, md: 7 }} boxShadow="sm">
            <Stack spacing={4}>
              <Heading size="md">登録済みの診療科</Heading>
              <Text color="surface.700">
                名前はこの一覧で直接変更できます。表示順はドラッグ、または先頭・最後・上下ボタンで変更します。
              </Text>
              {departments.length === 0 ? (
                <Text color="surface.700">診療科はまだ登録されていません。</Text>
              ) : (
                <Box maxH={{ base: "none", xl: "72vh" }} overflowY={{ base: "visible", xl: "auto" }} pr={{ xl: 2 }}>
                  <Stack spacing={3}>
                    {departments.map((department, index) => {
                      const nameDraft = nameDrafts[department.id] ?? department.name;
                      const isNameDirty = nameDraft.trim() !== department.name;
                      const isBusy = savingDepartmentId === department.id;
                      const isDragging = draggingDepartmentId === department.id;
                      const isDragOver =
                        dragOverDepartmentId === department.id &&
                        draggingDepartmentId &&
                        draggingDepartmentId !== department.id;

                      return (
                        <Box
                          key={department.id}
                          onDragOver={(event) => {
                            event.preventDefault();
                            if (draggingDepartmentId && draggingDepartmentId !== department.id) {
                              setDragOverDepartmentId(department.id);
                            }
                          }}
                          onDrop={(event) => {
                            event.preventDefault();
                            handleDropDepartment(department.id);
                          }}
                          onDragEnd={() => {
                            setDraggingDepartmentId("");
                            setDragOverDepartmentId("");
                          }}
                          borderWidth={isDragOver ? "2px" : "1px"}
                          borderColor={isDragOver ? "teal.400" : "surface.200"}
                          borderRadius="20px"
                          p={{ base: 3, md: 4 }}
                          bg={isDragging ? "surface.100" : "white"}
                          opacity={isDragging ? 0.75 : 1}
                          transition="all 0.15s ease"
                        >
                          <Stack spacing={3}>
                            <HStack justify="space-between" align="center" flexWrap="wrap" gap={3}>
                              <HStack spacing={3} flexWrap="wrap">
                                <Box
                                  draggable={savingAction !== "reorder"}
                                  onDragStart={(event) => {
                                    event.dataTransfer.effectAllowed = "move";
                                    handleDragStart(department.id);
                                  }}
                                  onDragEnd={() => {
                                    setDraggingDepartmentId("");
                                    setDragOverDepartmentId("");
                                  }}
                                  cursor={savingAction === "reorder" ? "default" : "grab"}
                                  userSelect="none"
                                  px={2}
                                  py={1}
                                  borderRadius="md"
                                  bg="surface.100"
                                  color="surface.700"
                                >
                                  ⋮⋮
                                </Box>
                                <Badge px={3} py={1} borderRadius="full" colorScheme="blue">
                                  {index + 1} 番目
                                </Badge>
                                <Badge
                                  px={3}
                                  py={1}
                                  borderRadius="full"
                                  colorScheme={department.is_active ? "teal" : "red"}
                                >
                                  {department.is_active ? "受付中" : "停止中"}
                                </Badge>
                                {isNameDirty && (
                                  <Badge px={3} py={1} borderRadius="full" colorScheme="orange">
                                    名前は未保存
                                  </Badge>
                                )}
                              </HStack>
                              <HStack spacing={3}>
                                <HStack spacing={2}>
                                  <Text fontSize="sm" color="surface.700">
                                    受付
                                  </Text>
                                  <Switch
                                    colorScheme="teal"
                                    isChecked={department.is_active}
                                    isDisabled={isBusy}
                                    onChange={() => handleToggleDepartment(department)}
                                  />
                                </HStack>
                              </HStack>
                            </HStack>

                            <Grid templateColumns={{ base: "1fr", lg: "minmax(0, 1fr) auto" }} gap={3} alignItems="end">
                              <FormControl>
                                <FormLabel mb={1}>診療科名</FormLabel>
                                <Input
                                  size="md"
                                  value={nameDraft}
                                  onChange={(event) =>
                                    handleChangeNameDraft(department.id, event.target.value)
                                  }
                                  placeholder="診療科名を入力"
                                />
                              </FormControl>
                              <HStack spacing={2} justify={{ base: "flex-start", lg: "flex-end" }} flexWrap="wrap">
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() => handleMoveDepartment(department.id, "first")}
                                  isDisabled={index === 0 || savingAction === "reorder"}
                                >
                                  先頭へ
                                </Button>
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() => handleMoveDepartment(department.id, "up")}
                                  isDisabled={index === 0 || savingAction === "reorder"}
                                >
                                  上へ
                                </Button>
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() => handleMoveDepartment(department.id, "down")}
                                  isDisabled={index === departments.length - 1 || savingAction === "reorder"}
                                >
                                  下へ
                                </Button>
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() => handleMoveDepartment(department.id, "last")}
                                  isDisabled={index === departments.length - 1 || savingAction === "reorder"}
                                >
                                  最後へ
                                </Button>
                              </HStack>
                            </Grid>

                            <HStack spacing={2} flexWrap="wrap">
                              <Button
                                size="sm"
                                colorScheme="teal"
                                isLoading={isBusy && savingAction === "save"}
                                isDisabled={!nameDraft.trim() || !isNameDirty}
                                onClick={() => handleSaveDepartmentName(department, index)}
                              >
                                名前を保存
                              </Button>
                              <Button
                                size="sm"
                                variant="outline"
                                isDisabled={!isNameDirty}
                                onClick={() => handleResetDepartmentName(department)}
                              >
                                入力を戻す
                              </Button>
                              <Button
                                size="sm"
                                colorScheme="red"
                                variant="outline"
                                isLoading={isBusy && savingAction === "delete"}
                                onClick={() => handleDeleteDepartment(department)}
                              >
                                削除
                              </Button>
                            </HStack>
                          </Stack>
                        </Box>
                      );
                    })}
                  </Stack>
                </Box>
              )}
            </Stack>
          </Box>

          <Grid templateColumns={{ base: "1fr", lg: "1fr 1fr" }} gap={6} alignItems="start">
            <Box bg="white" borderRadius="24px" p={{ base: 5, md: 7 }} boxShadow="sm">
              <Stack spacing={4}>
                <Heading size="md">新しい診療科を追加する</Heading>
                <Text color="surface.700">
                  新しい診療科は末尾に追加されます。並び順は追加後に一覧で変えられます。
                </Text>
                <FormControl>
                  <FormLabel>診療科名</FormLabel>
                  <Input
                    value={newDepartment.name}
                    onChange={(event) =>
                      setNewDepartment((current) => ({
                        ...current,
                        name: event.target.value,
                      }))
                    }
                    placeholder="例: 脳神経外科"
                  />
                </FormControl>
                <HStack justify="space-between" bg="surface.100" borderRadius="18px" p={4}>
                  <Box>
                    <Text fontSize="sm" color="surface.700">
                      受付状態
                    </Text>
                    <Text mt={1} fontSize="lg" fontWeight="800">
                      {newDepartment.isActive ? "受付中" : "停止中"}
                    </Text>
                  </Box>
                  <Switch
                    colorScheme="teal"
                    isChecked={newDepartment.isActive}
                    onChange={(event) =>
                      setNewDepartment((current) => ({
                        ...current,
                        isActive: event.target.checked,
                      }))
                    }
                  />
                </HStack>
                <HStack spacing={3}>
                  <Button
                    colorScheme="teal"
                    isLoading={addDepartmentSaving}
                    onClick={handleAddDepartment}
                  >
                    診療科を追加する
                  </Button>
                  <Button
                    variant="outline"
                    onClick={() =>
                      setNewDepartment({
                        name: "",
                        isActive: true,
                      })
                    }
                  >
                    入力をクリア
                  </Button>
                </HStack>
              </Stack>
            </Box>

            <Box bg="white" borderRadius="24px" p={{ base: 5, md: 7 }} boxShadow="sm">
              <Stack spacing={3}>
                <Heading size="md">操作のしかた</Heading>
                <Text color="surface.700">
                  名前変更は一覧で直接入力して「名前を保存」を押します。追加フォームは新規登録専用です。
                </Text>
                <Text color="surface.700">
                  表示順はドラッグ、または「先頭へ」「最後へ」「上へ」「下へ」で変更できます。
                </Text>
                <Text color="surface.700">
                  削除は完全削除です。予約が残っている診療科は削除できません。
                </Text>
              </Stack>
            </Box>
          </Grid>
        </Stack>
      )}
    </PageShell>
  );
}
