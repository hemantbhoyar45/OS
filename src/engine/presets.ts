import { PresetJob } from './types';

export const PRESET_JOBS: PresetJob[] = [
  {
    id: 'p2_invalid_page_fault',
    name: 'Phase 2: Invalid Page Fault (Repo Sample)',
    phase: 2,
    description: 'The exact sample from repository input.txt. Allocates pages for GD10, GD30, GD40, GD50, but then accesses unallocated page 2 with LR20, causing an Invalid Page Fault (PI=3 -> Terminate 6).',
    expectedOutcome: 'Terminates with INVALID PAGE FAULT at IC=05, IR=LR20, TTC=9, LLC=0',
    code: `$AMJ000200150003
GD10GD30GD40GD50LR20CR30BT09PD50HPD40
$DTA
VIT
VIIT
IS SAME
NOT SAME
$END0002`
  },
  {
    id: 'p2_successful_execution',
    name: 'Phase 2: Successful Execution & Branching',
    phase: 2,
    description: 'Loads strings into pages 1, 2, 3, 4. Compares page 1 with page 2 (CR20). If equal branches to BT08. Demonstrates successful demand paging, comparison, PD output, and normal Halt (SI=3).',
    expectedOutcome: 'NO ERROR - Prints result to output and halts cleanly with SI=3.',
    code: `$AMJ000100400010
GD10GD20GD30GD40LR10CR20BT08PD30HPD40H
$DTA
DATA
DATA
STRINGS_ARE_EQUAL
STRINGS_NOT_EQUAL
$END0001`
  },
  {
    id: 'p2_time_limit_exceeded',
    name: 'Phase 2: Time Limit Exceeded (TTL)',
    phase: 2,
    description: 'Configures a very short Total Time Limit (TTL=0004). After fetching 2 instructions and loading, TTC reaches 4, triggering Timer Interrupt TI=2.',
    expectedOutcome: 'TIME LIMIT EXCEEDED (TI=2 -> Terminate 3)',
    code: `$AMJ000300040010
GD10GD20GD30H
$DTA
LINE_ONE
LINE_TWO
LINE_THREE
$END0003`
  },
  {
    id: 'p2_line_limit_exceeded',
    name: 'Phase 2: Line Limit Exceeded (TLL)',
    phase: 2,
    description: 'Configures Total Line Limit TLL=0001. Program attempts multiple PD writes. When LLC exceeds 1, triggers Line Limit termination.',
    expectedOutcome: 'LINE LIMIT EXCEEDED (Terminate 2)',
    code: `$AMJ000400500001
GD10GD20PD10PD20H
$DTA
HELLO_WORLD
SECOND_LINE_EXCEEDS
$END0004`
  },
  {
    id: 'p2_opcode_error',
    name: 'Phase 2: Operation Code Error',
    phase: 2,
    description: 'Contains invalid opcode ZZZZ. CPU decode sets Program Interrupt PI=1, terminating with Operation Code Error.',
    expectedOutcome: 'OPERATION CODE ERROR (PI=1 -> Terminate 4)',
    code: `$AMJ000500200005
GD10ZZ99PD10H
$DTA
SAMPLE_DATA
$END0005`
  },
  {
    id: 'p2_operand_error',
    name: 'Phase 2: Operand Error (Address Bounds)',
    phase: 2,
    description: 'Instruction GD9A or access beyond memory bounds (VA >= 100). Sets PI=2, terminating with Operand Error.',
    expectedOutcome: 'OPERAND ERROR (PI=2 -> Terminate 5)',
    code: `$AMJ000600200005
GD10GDABH
$DTA
TEST_DATA
$END0006`
  },
  {
    id: 'p1_basic_job',
    name: 'Phase 1: Sequential Batch Processing',
    phase: 1,
    description: 'Sequential memory loading without paging (Memory M[100][4]). Demonstrates Phase 1 supervisor calls and simple execution.',
    expectedOutcome: 'Phase 1 execution completed. Sequential memory inspection enabled.',
    code: `$AMJ000100500050
GD20GD30GD40GD50LR30CR30BT08PD50HPD40H
$DTA
10
30
EQUAL 
NOT EQUAL
$END0001`
  }
];
